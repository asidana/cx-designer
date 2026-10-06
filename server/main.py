"""
Agentic CX Designer — Backend API (FastAPI)

Provides:
- Flow CRUD operations
- Build and deployment management
- Eval suite execution
- User authentication
- Multi-tenant support
"""

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import json

app = FastAPI(title="Agentic CX Designer API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Database Models (SQLAlchemy-style)
# ============================================

from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

DATABASE_URL = "postgresql://user:password@localhost/agentic_cx"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FlowModel(Base):
    __tablename__ = "flows"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    version = Column(String, default="1.0.0")
    description = Column(Text)
    flow_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String)
    is_public = Column(Integer, default=0)
    
    builds = relationship("BuildModel", back_populates="flow")
    deployments = relationship("DeploymentModel", back_populates="flow")

class BuildModel(Base):
    __tablename__ = "builds"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    flow_id = Column(String, ForeignKey("flows.id"))
    version = Column(String, nullable=False)
    status = Column(String, default="building")  # building, testing, ready, failed
    flow_json = Column(JSON, nullable=False)
    test_results = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    flow = relationship("FlowModel", back_populates="builds")

class DeploymentModel(Base):
    __tablename__ = "deployments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    flow_id = Column(String, ForeignKey("flows.id"))
    build_id = Column(String, ForeignKey("builds.id"))
    environment = Column(String)  # staging, production
    region = Column(String)
    status = Column(String)  # deploying, active, rolled_back, failed
    traffic_percentage = Column(Integer, default=0)
    deployed_at = Column(DateTime, default=datetime.utcnow)
    rolled_back_at = Column(DateTime)
    
    flow = relationship("FlowModel", back_populates="deployments")

class EvalSuiteModel(Base):
    __tablename__ = "eval_suites"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    flow_id = Column(String, ForeignKey("flows.id"))
    test_cases = Column(JSON, nullable=False)
    evaluators = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# ============================================
# Pydantic Schemas
# ============================================

class FlowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    flow_json: Dict[str, Any]

class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    flow_json: Optional[Dict[str, Any]] = None

class FlowResponse(BaseModel):
    id: str
    name: str
    version: str
    description: Optional[str]
    flow_json: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BuildCreate(BaseModel):
    flow_id: str
    version: str

class BuildResponse(BaseModel):
    id: str
    flow_id: str
    version: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class DeploymentCreate(BaseModel):
    flow_id: str
    build_id: str
    environment: str
    region: str

class EvalSuiteCreate(BaseModel):
    name: str
    flow_id: str
    test_cases: List[Dict[str, Any]]
    evaluators: List[Dict[str, Any]]

# ============================================
# Dependency
# ============================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================
# Flow Endpoints
# ============================================

@app.post("/api/flows", response_model=FlowResponse)
def create_flow(flow: FlowCreate, db: Session = Depends(get_db)):
    db_flow = FlowModel(
        name=flow.name,
        description=flow.description,
        flow_json=flow.flow_json
    )
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow

@app.get("/api/flows", response_model=List[FlowResponse])
def list_flows(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(FlowModel).offset(skip).limit(limit).all()

@app.get("/api/flows/{flow_id}", response_model=FlowResponse)
def get_flow(flow_id: str, db: Session = Depends(get_db)):
    flow = db.query(FlowModel).filter(FlowModel.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    return flow

@app.put("/api/flows/{flow_id}", response_model=FlowResponse)
def update_flow(flow_id: str, flow: FlowUpdate, db: Session = Depends(get_db)):
    db_flow = db.query(FlowModel).filter(FlowModel.id == flow_id).first()
    if not db_flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    if flow.name:
        db_flow.name = flow.name
    if flow.description:
        db_flow.description = flow.description
    if flow.flow_json:
        db_flow.flow_json = flow.flow_json
        db_flow.version = str(float(db_flow.version) + 0.1)
    
    db.commit()
    db.refresh(db_flow)
    return db_flow

@app.delete("/api/flows/{flow_id}")
def delete_flow(flow_id: str, db: Session = Depends(get_db)):
    flow = db.query(FlowModel).filter(FlowModel.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    db.delete(flow)
    db.commit()
    return {"message": "Flow deleted"}

# ============================================
# Build Endpoints
# ============================================

@app.post("/api/builds", response_model=BuildResponse)
def create_build(build: BuildCreate, db: Session = Depends(get_db)):
    flow = db.query(FlowModel).filter(FlowModel.id == build.flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    db_build = BuildModel(
        flow_id=build.flow_id,
        version=build.version,
        flow_json=flow.flow_json,
        status="ready"
    )
    db.add(db_build)
    db.commit()
    db.refresh(db_build)
    return db_build

@app.get("/api/builds/{build_id}", response_model=BuildResponse)
def get_build(build_id: str, db: Session = Depends(get_db)):
    build = db.query(BuildModel).filter(BuildModel.id == build_id).first()
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return build

# ============================================
# Deployment Endpoints
# ============================================

@app.post("/api/deployments")
def create_deployment(deployment: DeploymentCreate, db: Session = Depends(get_db)):
    db_deployment = DeploymentModel(
        flow_id=deployment.flow_id,
        build_id=deployment.build_id,
        environment=deployment.environment,
        region=deployment.region,
        status="active",
        traffic_percentage=100
    )
    db.add(db_deployment)
    db.commit()
    db.refresh(db_deployment)
    return db_deployment

@app.post("/api/deployments/{deployment_id}/rollback")
def rollback_deployment(deployment_id: str, db: Session = Depends(get_db)):
    deployment = db.query(DeploymentModel).filter(DeploymentModel.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    deployment.status = "rolled_back"
    deployment.rolled_back_at = datetime.utcnow()
    deployment.traffic_percentage = 0
    
    db.commit()
    return {"message": "Deployment rolled back"}

# ============================================
# Eval Endpoints
# ============================================

@app.post("/api/eval-suites")
def create_eval_suite(suite: EvalSuiteCreate, db: Session = Depends(get_db)):
    db_suite = EvalSuiteModel(
        name=suite.name,
        flow_id=suite.flow_id,
        test_cases=suite.test_cases,
        evaluators=suite.evaluators
    )
    db.add(db_suite)
    db.commit()
    db.refresh(db_suite)
    return db_suite

@app.get("/api/eval-suites/{suite_id}")
def get_eval_suite(suite_id: str, db: Session = Depends(get_db)):
    suite = db.query(EvalSuiteModel).filter(EvalSuiteModel.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="Eval suite not found")
    return suite

# ============================================
# WebSocket for Real-Time Testing
# ============================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/test/{flow_id}")
async def test_websocket(websocket: WebSocket, flow_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "test.start":
                await websocket.send_text(json.dumps({
                    "type": "test.trace",
                    "nodeId": "start",
                    "eventType": "start",
                    "data": {"message": "Test session started"},
                    "timestamp": datetime.utcnow().timestamp(),
                    "latencyMs": 0
                }))
            
            elif message["type"] == "test.text":
                # Execute flow with text input
                await websocket.send_text(json.dumps({
                    "type": "test.trace",
                    "nodeId": "agent",
                    "eventType": "complete",
                    "data": {"response": "Mock response"},
                    "timestamp": datetime.utcnow().timestamp(),
                    "latencyMs": 1200
                }))
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============================================
# Health Check
# ============================================

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.1.0"}

# ============================================
# Run
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
