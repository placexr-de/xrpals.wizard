/*
 * Copyright (c) 2026 Dominik Grzelak
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.swarmwalker.karol.backend.web.controller;

import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.swarmwalker.karol.backend.XrpalsProperties;
import org.swarmwalker.karol.backend.runner.ProcessResult;
import org.swarmwalker.karol.backend.web.dto.LpsSyncJobAck;
import org.swarmwalker.karol.backend.web.dto.LpsSyncJobRequest;
import org.swarmwalker.karol.backend.web.dto.LpsSyncJobResult;
import org.swarmwalker.karol.backend.web.service.LpsAnchorYamlWriterService;
import org.swarmwalker.karol.backend.web.service.LpsSyncJobService;
import org.swarmwalker.karol.backend.web.service.LpsSyncJobStore;
import org.swarmwalker.karol.backend.web.service.WebSocketBroadcaster;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/lps")
@Validated
public class LpsSyncJobController {

    private static final Logger log = LoggerFactory.getLogger(LpsSyncJobController.class);

    private final LpsSyncJobStore jobStore;
    private final LpsSyncJobService LpsSyncJobService;
    private final WebSocketBroadcaster websocketBroadcaster;
    private final XrpalsProperties props;
    private final LpsAnchorYamlWriterService yamlWriter;
    @Autowired
    public LpsSyncJobController(LpsSyncJobService LpsSyncJobService, LpsSyncJobStore jobStore, XrpalsProperties props,
                                WebSocketBroadcaster websocketBroadcaster,
                                LpsAnchorYamlWriterService yamlWriter) {
        this.LpsSyncJobService = LpsSyncJobService;
        this.jobStore = jobStore;
        this.props = props;
        this.websocketBroadcaster = websocketBroadcaster;
        this.yamlWriter = yamlWriter;
    }

    @PostMapping(value = "/anchors", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<LpsSyncJobAck> run(@Valid @RequestBody LpsSyncJobRequest req) throws IOException {

        String jobId = UUID.randomUUID().toString();
        Duration timeout = Duration.ofMillis(req.getTimeoutMs());
        LpsSyncJobResult queued = LpsSyncJobResult.empty(jobId);
        jobStore.put(queued);
        websocketBroadcaster.broadcast(queued);
        String filename = FilenameUtils.getName(req.getFile());
        String workingDir = props.getWorkingDir();

        Path overwritePath = Paths.get(String.valueOf(Path.of(props.getUploadsDir()).toAbsolutePath().normalize()), filename);
        //Path.of(workingDir, props.getUploadsDir(), filename);
        yamlWriter.writeAnchors(overwritePath, req.getAnchors());

        String command =
                "docker run --rm " +
                        "--device-cgroup-rule='c 189:* rmw' " +
                        "--volume \"/dev:/dev\" " +
                        "--mount type=bind,source=$(pwd)/uploads,target=/home/user/dev_ws/libs/crazyflie-controller/examples " +
                        "cf-pyctrl " +
                        "bash -lc \"cd /home/user/dev_ws/libs/crazyflie-controller/examples/ && " +
                        "cat " + filename +
                        " | python3 -u ./set_positions.py " + req.getUri() + "\"";
        CompletableFuture<ProcessResult> future =
                Objects.requireNonNull(
                        LpsSyncJobService
                                .runShellCommand(workingDir, command, timeout), "runShellCommand must not return null"
                );
        future.whenComplete((result, ex) -> {

            LpsSyncJobResult jobResult = LpsSyncJobResult.firstCompleted(jobId);
            jobStore.put(jobResult);
            websocketBroadcaster.broadcast(jobResult);

            if (ex != null) {
                log.error("Job {} failed with exception", jobId, ex);

                jobResult = new LpsSyncJobResult(
                        jobId,
                        "EXCEPTION",
                        -1,
                        "Execution failed with exception: " + ex.getMessage(),
                        List.of(),
                        List.of(ex.toString())
                );

            } else if (result.isSuccess()) {

                log.info("Job {} succeeded (exitCode={})", jobId, result.getExitCode());

                jobResult = new LpsSyncJobResult(
                        jobId,
                        "SUCCESS",
                        result.getExitCode(),
                        "Command executed successfully",
                        result.getOutput(),
                        result.getErrors()
                );

            } else if (result.isTimedOut()) {

                log.warn("Job {} timed out", jobId);

                jobResult = new LpsSyncJobResult(
                        jobId,
                        "TIMEOUT",
                        result.getExitCode(),
                        "Execution timed out after configured timeout",
                        result.getOutput(),
                        result.getErrors()
                );

            } else {

                log.warn("Job {} failed (exitCode={}) errors={}", jobId, result.getExitCode(), result.getErrors());

                jobResult = new LpsSyncJobResult(
                        jobId,
                        "FAILED",
                        result.getExitCode(),
                        "Command finished with non-zero exit code",
                        result.getOutput(),
                        result.getErrors()
                );
            }

            jobStore.put(jobResult);
            websocketBroadcaster.broadcast(jobResult);
        });

        return Mono.just(new LpsSyncJobAck(jobId));
    }
}