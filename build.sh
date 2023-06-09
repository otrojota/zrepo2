VERSION=0.37
docker buildx build --push --platform linux/amd64,linux/arm64 -t docker.homejota.net/geoos/zrepo2:$VERSION -t docker.homejota.net/geoos/zrepo2:latest .

#docker push docker.homejota.net/geoos/zrepo2:$VERSION
#docker push docker.homejota.net/geoos/zrepo2:latest
#docker tag docker.homejota.net/geoos/zrepo2:$VERSION docker.homejota.net/geoos/zrepo2:latest
