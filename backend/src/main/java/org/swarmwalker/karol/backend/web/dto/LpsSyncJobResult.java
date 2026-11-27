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
package org.swarmwalker.karol.backend.web.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LpsSyncJobResult {

    public enum LpsSyncJobStatus {

        EMPTY("EMPTY"),
        RUNNING("RUNNING"),
        SUCCESS("SUCCESS"),
        FAILED("FAILED"),
        TIMEOUT("TIMEOUT"),
        COMPLETED("COMPLETED"),
        EXCEPTION("EXCEPTION");


        public static LpsSyncJobStatus fromString(String value) {
            if (value == null) {
                return EXCEPTION;
            }

            try {
                return LpsSyncJobStatus.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                return EXCEPTION;
            }
        }

        private final String label;

        LpsSyncJobStatus(String label) {
            this.label = label;
        }

        public String jsonLabel() {
            return label;
        }
    }

    private String jobId;
    private LpsSyncJobStatus status;
    private int exitCode;
    private String message;
    private List<String> output;
    private List<String> errors;

    public static LpsSyncJobResult empty(String jobId) {
        return new LpsSyncJobResult(jobId, LpsSyncJobStatus.EMPTY, 0, "", List.of(), List.of());
    }

    public static LpsSyncJobResult firstCompleted(String jobId) {
        return new LpsSyncJobResult(jobId, LpsSyncJobStatus.COMPLETED, 0, "", List.of(), List.of());
    }

    public LpsSyncJobResult() {
    }

    public LpsSyncJobResult(String jobId, String status, int exitCode,
                            String message, List<String> output, List<String> errors) {
        this.jobId = jobId;
        this.status = LpsSyncJobStatus.fromString(status);
        this.exitCode = exitCode;
        this.message = message;
        this.output = output;
        this.errors = errors;
    }

    public LpsSyncJobResult(String jobId, LpsSyncJobStatus status, int exitCode,
                            String message, List<String> output, List<String> errors) {
        this.jobId = jobId;
        this.status = status;
        this.exitCode = exitCode;
        this.message = message;
        this.output = output;
        this.errors = errors;
    }


}