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
package org.swarmwalker.karol.backend.runner;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.SystemUtils;

/**
 *
 * @author Dominik Grzelak
 */
public class ProcessCommandLineRunner {

    private static volatile ProcessCommandLineRunner instance;

    private ProcessCommandLineRunner() {
    }

    public static ProcessCommandLineRunner getInstance() {
        if (instance == null) {
            synchronized (ProcessCommandLineRunner.class) {
                if (instance == null) {
                    instance = new ProcessCommandLineRunner();
                }
            }
        }
        return instance;
    }

    public boolean callAndThen(String scriptWorkingDirectory, String command) {
        return callAndThen(scriptWorkingDirectory, command, Duration.ofSeconds(60),
                ProcessHandler.DEFAULT_SUCCESS, ProcessHandler.DEFAULT_FAILURE);
    }

    public boolean callAndThen(String scriptWorkingDirectory, String command, Duration timeout) {
        return callAndThen(scriptWorkingDirectory, command, timeout,
                ProcessHandler.DEFAULT_SUCCESS, ProcessHandler.DEFAULT_FAILURE);
    }

    /**
     * Executes a command in the specified directory with a given timeout and handles the result using provided handlers.
     *
     * @param scriptWorkingDirectory the directory in which the command should be executed
     * @param command                the command to be executed
     * @param timeout                the maximum time to wait for the command to complete
     * @param onSuccess              a handler to be executed if the command succeeds
     * @param onFailure              a handler to be executed if the command fails
     * @return true if the command executed successfully, false otherwise
     */
    public boolean callAndThen(
            String scriptWorkingDirectory,
            String command,
            Duration timeout,
            ProcessHandler onSuccess,
            ProcessHandler onFailure
    ) {
        ProcessResult result = callResult(scriptWorkingDirectory, command, timeout);

        onSuccess = Objects.requireNonNullElse(onSuccess, ProcessHandler.DEFAULT_SUCCESS);
        onFailure = Objects.requireNonNullElse(onFailure, ProcessHandler.DEFAULT_FAILURE);

        if (result.isSuccess()) {
            onSuccess.handle(result);
            return true;
        } else {
            onFailure.handle(result);
            return false;
        }
    }

    public synchronized ProcessResult callResult(String scriptWorkingDirectory, String command) {
        return callResult(scriptWorkingDirectory, command, Duration.ofSeconds(60));
    }

    /**
     * Executes a shell command in the specified working directory with a given timeout.
     * Executes the command and returns ProcessResult only.
     * No handlers.
     * The method waits for the command to complete, capturing any output or errors generated during execution.
     *
     * @param scriptWorkingDirectory the directory in which the command should be executed
     * @param command                the command to be executed
     * @param timeout                the maximum time to wait for the command to complete; if null or non-positive, defaults to 60 seconds
     * @return a ProcessResult object containing the exit code, output, errors, and status of the execution (including whether it timed out or was forcibly killed)
     */
    public synchronized ProcessResult callResult(String scriptWorkingDirectory, String command, Duration timeout) {
        if (timeout == null || timeout.isNegative() || timeout.isZero()) {
            timeout = Duration.ofSeconds(60);
        }
        long pid = -1;
        try {
            String[] shell = resolveShell();

            ProcessBuilder pb = new ProcessBuilder(shell[0], shell[1], command);
            pb.directory(new File(scriptWorkingDirectory));
            pb.redirectErrorStream(true);

            Process p = pb.start();
            pid = p.pid();

            List<String> out = readProcessOutput(p.getInputStream());

            boolean finished = p.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
            out.forEach(System.out::println);
            if (!finished) {
                boolean killed = false;
                try {
                    p.destroy();
                    if (p.isAlive()) {
                        p.destroyForcibly();
                        killed = true;
                    }
                } catch (Exception e) {
                    return new ProcessResult(pid, p.exitValue(), out, List.of(e.getMessage()), true, killed);
                }

                return new ProcessResult(pid, p.exitValue(), out, List.of("Timed out after " + timeout), true, killed);
            }

            return new ProcessResult(pid, p.exitValue(), out, List.of(), false, false);

        } catch (IOException e) {
            return new ProcessResult(pid, -1, List.of(), List.of(e.getMessage()), false, false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new ProcessResult(pid, -1, List.of(), List.of("Interrupted: " + e.getMessage()), false, false);
        }
    }

    private static List<String> readProcessOutput(InputStream inputStream) throws IOException {
        return IOUtils.readLines(inputStream, "UTF-8");
    }

    private static String[] resolveShell() {
        if (SystemUtils.IS_OS_WINDOWS) {
            return new String[]{"cmd.exe", "/c"};
        }

        // Linux
        File bash = new File("/bin/bash");
        if (bash.exists() && bash.canExecute()) {
            return new String[]{"/bin/bash", "-lc"}; // -l helps pick up PATH/environment
        }

        // POSIX shell
        File sh = new File("/bin/sh");
        if (sh.exists() && sh.canExecute()) {
            return new String[]{"/bin/sh", "-lc"};
        }

        // default
        return new String[]{"bash", "-c"};
    }
}
