FROM node:11.1.0

RUN apt-get update && \
    apt-get install -y libudev-dev && \
    mkdir -p /usr/src/open-zwave && \
    curl -fLsS \
      https://api.github.com/repos/OpenZWave/open-zwave/tarball/master | \
      tar xz -C /usr/src/open-zwave --strip-components 1 && \
    cd /usr/src/open-zwave && \
    make && \
    make install

WORKDIR /code

COPY package-lock.json package.json ./
RUN npm install

CMD ["bin/run"]
