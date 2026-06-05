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
package org.swarmwalker.karol.backend.data;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class LpsAnchorPositionMessage {

    /**
     * Key: anchor id (0...n)
     * Value: position (x,y,z)
     */
    @NotNull
    @Valid
    private Map<Integer, AnchorPosition> anchors = new LinkedHashMap<>();

    public LpsAnchorPositionMessage() {
    }

    public LpsAnchorPositionMessage(Map<Integer, AnchorPosition> anchors) {
        this.anchors = anchors;
    }

    public Map<Integer, AnchorPosition> getAnchors() {
        return anchors;
    }

    public void setAnchors(Map<Integer, AnchorPosition> anchors) {
        this.anchors = anchors;
    }
}