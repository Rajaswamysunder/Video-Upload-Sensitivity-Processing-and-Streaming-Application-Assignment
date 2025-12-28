const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join user-specific room for personalized updates
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
      }
    });

    // Leave room
    socket.on('leave', (userId) => {
      if (userId) {
        socket.leave(userId);
        console.log(`User ${userId} left their room`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
