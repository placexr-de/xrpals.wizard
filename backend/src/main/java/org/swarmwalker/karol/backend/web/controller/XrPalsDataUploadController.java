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