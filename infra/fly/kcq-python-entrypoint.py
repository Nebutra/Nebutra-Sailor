"""Bound upstream connections and serve both Fly health checks and private IPv6."""
import os
import socket

import uvicorn

socket.setdefaulttimeout(8)
listener = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
listener.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
listener.bind(("::", int(os.environ.get("PORT", "8080"))))
listener.listen(2048)
listener.setblocking(False)
server = uvicorn.Server(uvicorn.Config("server:app", lifespan="off"))
server.run(sockets=[listener])
