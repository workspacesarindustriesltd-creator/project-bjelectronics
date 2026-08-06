void import("./server/index.js").catch((error) => {
  console.error("Failed to start the BJ Electronics server.", error);
  process.exitCode = 1;
});
