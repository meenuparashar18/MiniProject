let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
};

const getIo = () => ioInstance;

module.exports = {
  getIo,
  setIo,
};
