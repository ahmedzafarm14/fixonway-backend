const logger = (req, res, next) => {
  const clientIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  console.log(
    `Method: ${req.method}\nRequested URL: ${req.url}\nClient IP: ${clientIp}`
  );
  console.log("This is body:", req.body);

  next();
};

export default logger;
