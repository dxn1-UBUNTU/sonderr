FROM alpine AS base

# Disable the runtime transpiler cache by default inside Docker containers.
# On ephemeral containers, the cache is not useful
ARG BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_RUNTIME_TRANSPILER_CACHE_PATH}
RUN apk add libgcc libstdc++ ripgrep

FROM base AS build-amd64
# sonderr_change start
COPY dist/@sonderr/cli-linux-x64-baseline-musl/bin/sonderr dist/@sonderr/cli-linux-x64-baseline-musl/bin/bwrap /usr/local/bin/
COPY dist/@sonderr/cli-linux-x64-baseline-musl/bin/licenses /usr/local/share/licenses/sonderr
# sonderr_change end

FROM base AS build-arm64
# sonderr_change start
COPY dist/@sonderr/cli-linux-arm64-musl/bin/sonderr dist/@sonderr/cli-linux-arm64-musl/bin/bwrap /usr/local/bin/
COPY dist/@sonderr/cli-linux-arm64-musl/bin/licenses /usr/local/share/licenses/sonderr
# sonderr_change end

ARG TARGETARCH
FROM build-${TARGETARCH}
RUN sonderr --version
ENTRYPOINT ["sonderr"]
