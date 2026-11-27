/*
 * Copyright (c) 2026 Dominik Grzelak
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
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

@Slf4j
@RestController
@RequestMapping("/api/lps")
@Validated
public class LpsSyncJobController {

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
        Path normalizedPath = Path.of(props.getUploadsDir()).toAbsolutePath().normalize();
        String jobId = UUID.randomUUID().toString();
        Duration timeout = Duration.ofMillis(req.getTimeoutMs());
        LpsSyncJobResult queued = LpsSyncJobResult.empty(jobId);
        jobStore.put(queued);
        websocketBroadcaster.broadcast(queued);
        String filename = FilenameUtils.getName(req.getFile());
        String workingDir = props.getWorkingDir();

        Path overwritePath = Paths.get(String.valueOf(normalizedPath), filename);
        yamlWriter.writeAnchors(overwritePath, req.getAnchors());

        String command =
                "docker run --rm " +
                        "--device-cgroup-rule='c 189:* rmw' " +
                        "--volume \"/dev:/dev\" " +
                        "--mount type=bind,source=" + normalizedPath + "/" + filename + ",target=/home/user/dev_ws/libs/crazyflie-controller/examples/lps/" + filename + " " +
                        "cf-pyctrl " +
                        "bash -lc \"cd /home/user/dev_ws/libs/crazyflie-controller/examples/lps && " +
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