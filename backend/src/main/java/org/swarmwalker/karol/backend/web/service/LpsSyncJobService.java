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
package org.swarmwalker.karol.backend.web.service;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.swarmwalker.karol.backend.runner.ProcessCommandLineRunner;
import org.swarmwalker.karol.backend.runner.ProcessResult;

/**
 * @author Dominik Grzelak
 */
@Service
public class LpsSyncJobService {

    private final ProcessCommandLineRunner processRunner;

    public LpsSyncJobService(ProcessCommandLineRunner processRunner) {
        this.processRunner = processRunner;
    }

    @Async
    public CompletableFuture<ProcessResult> runShellCommand(
            String workingDir,
            String command,
            Duration timeout
    ) {
        ProcessResult result = processRunner.callResult(workingDir, command, timeout);
        return CompletableFuture.completedFuture(result);
    }
}