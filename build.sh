VERSION=0.10
docker build --platform linux/amd64,linux/arm64 -t docker.homejota.net/geoos/zrepo2:$VERSION .
docker push docker.homejota.net/geoos/zrepo2:$VERSION
docker tag docker.homejota.net/geoos/zrepo2:$VERSION docker.homejota.net/geoos/zrepo2:latest
