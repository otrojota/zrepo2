VERSION=0.13
docker buildx build --push --platform linux/amd64,linux/arm64 -t docker.homejota.net/geoos/zrepo2:$VERSION -t docker.homejota.net/geoos/zrepo2:latest .

#docker push docker.homejota.net/geoos/zrepo2:$VERSION
#docker tag docker.homejota.net/geoos/zrepo2:$VERSION docker.homejota.net/geoos/zrepo2:latest
