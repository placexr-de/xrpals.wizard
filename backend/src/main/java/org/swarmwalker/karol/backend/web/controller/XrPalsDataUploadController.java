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

import java.nio.file.Path;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.swarmwalker.karol.backend.data.LpsAnchorPositionMessage;
import org.swarmwalker.karol.backend.web.dto.XrPalsDataUploadResponseEvent;
import org.swarmwalker.karol.backend.web.service.WebSocketBroadcaster;
import org.swarmwalker.karol.backend.web.service.XrPalsDataService;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;


@RestController
public class XrPalsDataUploadController {

    private final XrPalsDataService service;
    private final WebSocketBroadcaster uploadWs;

    @Value("${xrpals.version:1.0}")
    private String XRPALS_VERSION;

    public XrPalsDataUploadController(XrPalsDataService service, WebSocketBroadcaster uploadWs) {
        this.service = service;
        this.uploadWs = uploadWs;
    }

    @GetMapping(path = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String index() {
        return "XR-PALS - Backend Upload and LPS Sync Server\nVersion: " + XRPALS_VERSION;
    }

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<XrPalsDataUploadResponseEvent>> upload(@RequestPart("file") MultipartFile file) {
        return Mono.fromCallable(() -> {
                    service.ensureUploadDir();

                    String ts = service.timestampUtc();
                    Path original = service.originalPath(ts);
                    Path converted = service.convertedPath(ts);

                    file.transferTo(original.toFile());
                    LpsAnchorPositionMessage msg = service.convertToInlineYaml(original, converted);

                    Instant now = Instant.now();

                    XrPalsDataUploadResponseEvent response =
                            new XrPalsDataUploadResponseEvent(
                                    ts,
                                    original.toString(),
                                    converted.toString(),
                                    file.getSize(),
                                    now,
                                    "SUCCESS",
                                    msg
                            );

                    uploadWs.broadcast(response);

                    return ResponseEntity.ok(response);
                })
                .subscribeOn(Schedulers.boundedElastic());
    }


}