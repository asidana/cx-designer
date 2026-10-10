/**
 * Collaboration Panel — multi-user collaboration
 */

import React, { useState, useEffect } from 'react';
import { collaborationManager, User, Comment } from '../collaboration/Collaboration';

interface CollaborationPanelProps {
  flowId: string;
  currentUser: User;
  onClose: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  flowId,
  currentUser,
  onClose
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    // Join flow
    collaborationManager.joinFlow(flowId, currentUser);

    // Subscribe to events
    const listenerId = `collab_${currentUser.id}`;
    collaborationManager.subscribe(listenerId, (event) => {
      if (event.type === 'user_joined' || event.type === 'user_left') {
        setUsers(collaborationManager.getOnlineUsers());
      }
      if (event.type === 'comment_added') {
        setComments(collaborationManager.getComments(flowId));
      }
    });

    // Initial state
    setUsers(collaborationManager.getOnlineUsers());
    setComments(collaborationManager.getComments(flowId));

    return () => {
      collaborationManager.leaveFlow(flowId, currentUser.id);
      collaborationManager.unsubscribe(listenerId);
    };
  }, [flowId, currentUser]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    collaborationManager.addComment(flowId, {
      flowId,
      userId: currentUser.id,
      userName: currentUser.name,
      content: newComment
    });

    setNewComment('');
  };

  const handleResolveComment = (commentId: string) => {
    collaborationManager.resolveComment(flowId, commentId);
    setComments(collaborationManager.getComments(flowId));
  };

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      right: 16,
      zIndex: 100,
      background: 'rgba(15, 15, 26, 0.98)',
      border: '1px solid #333',
      borderRadius: 12,
      padding: 20,
      width: 350,
      maxHeight: '70vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>👥 Collaboration</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18
          }}
        >
          ×
        </button>
      </div>

      {/* Online users */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
          Online ({users.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {users.map((user) => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: user.color
              }} />
              <span style={{ fontSize: 13 }}>{user.name}</span>
              {user.id === currentUser.id && (
                <span style={{ fontSize: 11, color: '#888' }}>(you)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div>
        <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
          Comments ({comments.length})
        </h3>

        {/* Add comment */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #333',
              background: '#1a1a2e',
              color: 'white',
              fontSize: 13
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddComment();
            }}
          />
          <button
            onClick={handleAddComment}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: 'none',
              background: '#8b5cf6',
              color: 'white',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Add
          </button>
        </div>

        {/* Comment list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#666', fontSize: 12 }}>
              No comments yet
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  padding: 8,
                  background: '#1a1a2e',
                  borderRadius: 4,
                  opacity: comment.resolved ? 0.5 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{comment.userName}</span>
                  <button
                    onClick={() => handleResolveComment(comment.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: comment.resolved ? '#10b981' : '#888',
                      cursor: 'pointer',
                      fontSize: 11
                    }}
                  >
                    {comment.resolved ? '✓ Resolved' : 'Resolve'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#aaa' }}>{comment.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
