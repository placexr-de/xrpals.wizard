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