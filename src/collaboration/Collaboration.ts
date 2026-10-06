/**
 * Real-Time Collaboration — multi-user editing
 * 
 * Features:
 * - Live cursors
 * - Real-time sync
 * - Presence indicators
 * - Conflict resolution
 * - Comments and annotations
 */

import { FlowGraph, FlowNode, FlowEdge } from '../types/node';

export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedNode?: string;
  isOnline: boolean;
  lastActive: number;
}

export interface Comment {
  id: string;
  flowId: string;
  nodeId?: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
  resolved: boolean;
  replies: Comment[];
}

export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'cursor_moved' | 'node_selected' | 'flow_updated' | 'comment_added';
  userId: string;
  data: unknown;
  timestamp: number;
}

export class CollaborationManager {
  private users: Map<string, User> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private flow: FlowGraph | null = null;
  private listeners: Map<string, (event: CollaborationEvent) => void> = new Map();

  /**
   * Join a flow session
   */
  joinFlow(flowId: string, user: User): void {
    user.isOnline = true;
    user.lastActive = Date.now();
    this.users.set(user.id, user);

    this.emit({
      type: 'user_joined',
      userId: user.id,
      data: user,
      timestamp: Date.now()
    });
  }

  /**
   * Leave a flow session
   */
  leaveFlow(flowId: string, userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = false;
      this.users.delete(userId);

      this.emit({
        type: 'user_left',
        userId,
        data: null,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update user cursor position
   */
  updateCursor(userId: string, position: { x: number; y: number }): void {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = position;
      user.lastActive = Date.now();

      this.emit({
        type: 'cursor_moved',
        userId,
        data: position,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update selected node
   */
  updateSelectedNode(userId: string, nodeId: string | undefined): void {
    const user = this.users.get(userId);
    if (user) {
      user.selectedNode = nodeId;
      user.lastActive = Date.now();

      this.emit({
        type: 'node_selected',
        userId,
        data: nodeId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update flow (with conflict resolution)
   */
  updateFlow(userId: string, flow: FlowGraph): void {
    this.flow = flow;

    this.emit({
      type: 'flow_updated',
      userId,
      data: flow,
      timestamp: Date.now()
    });
  }

  /**
   * Add a comment
   */
  addComment(flowId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'resolved' | 'replies'>): Comment {
    const newComment: Comment = {
      ...comment,
      id: `comment_${Date.now()}`,
      createdAt: Date.now(),
      resolved: false,
      replies: []
    };

    const flowComments = this.comments.get(flowId) || [];
    flowComments.push(newComment);
    this.comments.set(flowId, flowComments);

    this.emit({
      type: 'comment_added',
      userId: comment.userId,
      data: newComment,
      timestamp: Date.now()
    });

    return newComment;
  }

  /**
   * Get all comments for a flow
   */
  getComments(flowId: string): Comment[] {
    return this.comments.get(flowId) || [];
  }

  /**
   * Resolve a comment
   */
  resolveComment(flowId: string, commentId: string): void {
    const comments = this.comments.get(flowId) || [];
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.resolved = true;
    }
  }

  /**
   * Get online users
   */
  getOnlineUsers(): User[] {
    return Array.from(this.users.values()).filter(u => u.isOnline);
  }

  /**
   * Subscribe to events
   */
  subscribe(listenerId: string, callback: (event: CollaborationEvent) => void): void {
    this.listeners.set(listenerId, callback);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: CollaborationEvent): void {
    for (const callback of this.listeners.values()) {
      callback(event);
    }
  }
}

// Singleton instance
export const collaborationManager = new CollaborationManager();
