# XR-PALS Wizard: User Manual

## Run the application

### Starting the Backend
 
```shell
# Windows
$ mvnw.cmd spring-boot:run

# Linux
$ ./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--xrpals.uploads-dir=/home/dominik/Desktop/Bigraph-Universe/Applications/Swarmwalker/config-server/uploads-xrpalswizard"
```

or

```shell
$ ./mvnw clean package
$ java -jar target/backend-0.0.1-SNAPSHOT.jar
```

#### Configure Upload Directory

You can override the upload location in the following ways.

- Modify or add next to the JAR the `applications.properties`:

```properties
xrpals.uploads-dir=./uploads
```

- Using Environment Variable: `export XRPALS_UPLOADS_DIR=/tmp/xrpals` (Linux/MacOS) or `$env:XRPALS_UPLOADS_DIR="C:\xrpals\uploads"` (Windows)



- Using Spring Boot Maven Plugin

```shell
./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--xrpals.uploads-dir=/home/user/swarmwalker/config-server/uploads-xrpalswizard"
```

- Via the executable JAR

First build the application and then start it with the upload directory configured:

```shell
java -jar target/backend-0.0.1-SNAPSHOT.jar \
  --xrpals.uploads-dir=/home/user/swarmwalker/config-server/uploads-xrpalswizard
```


### Starting the Frontend

```shell
$ nvm install node --lts
$ nvm use --lts 
$ npm install
$ npm run dev
```

Open the browser at:
[`http://localhost:5173/`](http://localhost:5173/)

### Start cfPyCtrl for Live-Tracking (optional)

Note that the service must terminated when a syncjob should be run.

```shell
./vendor/cfpyctrl.sh \
  --uri radio://0/80/2M/E7E7E7E7B1 \
  --port 5000 \
  --wsendpoint \
  --wsport 8765
```

## Testing

### Test Upload

Test VR-Backend Connection (File Upload):

```shell
$ curl -X POST http://localhost:8080/upload \
  -F "file=@./backend/src/test/resources/20260303072022.xrpals.yaml"

$  curl -X POST http://localhost:8080/upload \
  -F "file=@./backend/src/test/resources/rectangle-small.yaml"
```

### Sync-Job API

All jobs
- `curl http://localhost:8080/api/lps/jobs/`

List job result details:
- `curl http://localhost:8080/api/lps/jobs/<jobId>`
- `curl http://localhost:8080/api/lps/jobs/45d2cb51-f6d7-4133-9f37-a553d71333d7`



