export default function error(err) {
  return {
    status: err.status,
    message: err.message,
  };
};

