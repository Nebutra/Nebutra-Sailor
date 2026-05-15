import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  vus: 5,
  duration: "30s",
};

export default function () {
  const res = http.get(__ENV.BASE_URL ?? "http://localhost:3000");
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}
