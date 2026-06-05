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
package org.swarmwalker.karol.backend.web.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.swarmwalker.karol.backend.web.dto.LpsSyncJobResult;
import org.swarmwalker.karol.backend.web.dto.XrPalsDataUploadResponseEvent;

@Service
public class WebSocketBroadcaster {

    private final SimpMessagingTemplate messaging;

    public WebSocketBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public void broadcast(XrPalsDataUploadResponseEvent event) {
        messaging.convertAndSend("/topic/upload", event);
    }

    public void broadcast(LpsSyncJobResult event) {
        messaging.convertAndSend("/topic/lps/jobs", event);
    }
}