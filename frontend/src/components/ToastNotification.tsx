import React from 'react';

const ToastNotification: React.FC<{ message: string }> = ({ message }) => (
  <div className="toast">{message}</div>
);

export default ToastNotification;
