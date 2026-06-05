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

import java.util.List;

public class ProcessResult {

    private final long pid;
    private final int exitCode;
    private final List<String> output;
    private final List<String> errors;
    private final boolean timedOut;
    private final boolean killed;


    public ProcessResult(long pid, int exitCode, List<String> output, List<String> errors) {
        this(pid, exitCode, output, errors, false, false);
    }

    public ProcessResult(long pid, int exitCode, List<String> output, List<String> errors, boolean timedOut, boolean killed) {
        this.pid = pid;
        this.exitCode = exitCode;
        this.output = output;
        this.errors = errors;
        this.timedOut = timedOut;
        this.killed = killed;
    }

    public int getExitCode() {
        return exitCode;
    }

    public List<String> getOutput() {
        return output;
    }

    public List<String> getErrors() {
        return errors;
    }

    public boolean isSuccess() {
        return exitCode == 0;
    }

    public boolean isTimedOut() { return timedOut; }
    public boolean isKilled() { return killed; }

    public long getPid() {
        return pid;
    }

    @Override
    public String toString() {
        return "ProcessResult{" +
                "exitCode=" + exitCode +
                ", output=" + output +
                ", errors=" + errors +
                '}';
    }
}