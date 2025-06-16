import React from "react";

function Error({ statusCode }) {
  return (
    <div style={{ padding: 40 }}>
      <h1>{statusCode ? `An error ${statusCode} occurred on server` : "An error occurred on client"}</h1>
      <p>Sorry, something went wrong.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error; 