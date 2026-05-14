import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const PopupMessage = ({ message, type = 'info', onClose, onConfirm }) => {
  if (!message) return null;

  let borderColor = 'var(--accent-cyan)';
  let glowColor = 'var(--accent-cyan-glow)';
  let Icon = Info;

  if (type === 'error') {
    borderColor = 'var(--accent-magenta)';
    glowColor = 'var(--accent-magenta-glow)';
    Icon = AlertCircle;
  } else if (type === 'success') {
    borderColor = 'var(--accent-cyan)';
    glowColor = 'var(--accent-cyan-glow)';
    Icon = CheckCircle2;
  } else if (type === 'warning') {
    borderColor = 'var(--accent-pink)';
    glowColor = 'rgba(255, 0, 255, 0.5)';
    Icon = AlertCircle;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(8, 16, 54, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      animation: 'fadeIn 0.2s ease-out forwards'
    }}>
      <div style={{
        background: 'var(--bg-panel)',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 20px ${glowColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '2.5rem',
        maxWidth: '450px',
        width: '90%',
        textAlign: 'center',
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: borderColor }}>
          <Icon size={48} />
        </div>
        <h3 style={{ 
          color: 'var(--text-primary)', 
          fontFamily: 'var(--font-heading)', 
          fontSize: '1.2rem', 
          marginBottom: '2rem',
          lineHeight: '1.5'
        }}>
          {message}
        </h3>
        {onConfirm ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={onClose}
              className="btn-secondary" 
              style={{ flex: 1, borderColor: borderColor, color: borderColor }}
            >
              CANCEL
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className="btn-primary" 
              style={{ flex: 1, borderColor: borderColor, color: borderColor }}
            >
              CONFIRM
            </button>
          </div>
        ) : (
          <button 
            onClick={onClose}
            className="btn-primary" 
            style={{ width: '100%', borderColor: borderColor, color: borderColor }}
          >
            ACKNOWLEDGE
          </button>
        )}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default PopupMessage;
