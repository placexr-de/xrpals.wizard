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