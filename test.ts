async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/events");
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text.substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}
run();
