FROM node:14.4

LABEL maintainer "Kyle Blue"

RUN apt-get update && \
    apt-get install --yes git wget zsh && \
    chsh -s /usr/bin/zsh root && \
    wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh


EXPOSE 8081
ENV PORT=8081
EXPOSE 25585
ENV DEBUG_PORT=25585
EXPOSE 25000-25200

WORKDIR /app

CMD /bin/zsh