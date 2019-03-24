FROM node:11.12.0

CMD ["bin/run"]

ENV LD_LIBRARY_PATH="/usr/local/lib:/usr/local/lib64"

RUN apt-get update && \
    apt-get install -y libudev-dev && \
    mkdir /usr/local/src/open-zwave && \
    curl -fLsS \
      https://api.github.com/repos/OpenZWave/open-zwave/tarball/master | \
      tar xz -C /usr/local/src/open-zwave --strip-components 1 && \
    cd /usr/local/src/open-zwave && \
    make && \
    make install

WORKDIR /code

COPY package-lock.json package.json ./
RUN npm install
