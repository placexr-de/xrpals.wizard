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
package org.swarmwalker.karol.backend;

import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webflux.test.autoconfigure.WebFluxTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.swarmwalker.karol.backend.web.controller.LpsSyncJobController;
import org.swarmwalker.karol.backend.web.dto.LpsSyncJobRequest;
import org.swarmwalker.karol.backend.web.service.LpsSyncJobService;


/**
 *
 */
@WebFluxTest(controllers = LpsSyncJobController.class)
class LpsControllerTest {

    @Autowired
    WebTestClient webTestClient;

    @MockitoBean
    LpsSyncJobService lpsService;

//    @Test
//    void postAnchors_shouldReturn200_andCallServiceWithRequestData() {
//
//        when(lpsService.runShellCommand(anyString(), anyString(), any(Duration.class)))
//                .thenReturn(CompletableFuture.completedFuture(
//                        new ProcessResult(-1, 0, List.of("ok"), List.of())
//                ));
//
//        LpsSyncJobRequest req = new LpsSyncJobRequest();
////        req.setWorkingDir("/home/user/dev_ws/libs/crazyflie-controller/examples/lps");
////        req.setCommand("cat 20260303072022.xrpals.yaml | python3 -u ./set_positions.py radio://0/80/2M/E7E7E7E7B2");
////                req.setWorkingDir("./");
//        req.setCommand("ls");
//        req.setTimeoutMs(60_000L);
//
//        webTestClient.post()
//                .uri("/api/lps/anchors")
//                .contentType(MediaType.APPLICATION_JSON)
//                .bodyValue(req)
//                .exchange()
//                .expectStatus().isOk()
//                .expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)
//                .expectBody(LpsSyncJobAck.class)
//                .value(ack -> assertThat(ack.getJobId()).isNotBlank());
//
//        // Verify service invoked once with expected values
//        ArgumentCaptor<String> wdCaptor = ArgumentCaptor.forClass(String.class);
//        ArgumentCaptor<String> cmdCaptor = ArgumentCaptor.forClass(String.class);
//        ArgumentCaptor<Duration> timeoutCaptor = ArgumentCaptor.forClass(Duration.class);
//
//        verify(lpsService, times(1))
//                .runShellCommand(wdCaptor.capture(), cmdCaptor.capture(), timeoutCaptor.capture());
//
////        assertThat(wdCaptor.getValue()).isEqualTo(req.getWorkingDir());
//        assertThat(cmdCaptor.getValue()).isEqualTo(req.getCommand());
//        assertThat(timeoutCaptor.getValue()).isEqualTo(Duration.ofMillis(req.getTimeoutMs()));
//    }


    @Test
    void postAnchors_shouldReturn400_andNotCallService_whenRequestInvalid() {

        LpsSyncJobRequest req = new LpsSyncJobRequest();
        // validation should fail because of missing command + workingDir
        req.setTimeoutMs(60_000L);

        webTestClient.post()
                .uri("/api/lps/anchors")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .exchange()
                .expectStatus().isBadRequest();

        verifyNoInteractions(lpsService);
    }

//    @Test
//    void postAnchors_shouldReturn500_andCallServiceWithRequestData_whenServiceReturnsNull() {
//
//        // Force the controller into the same NPE path you saw in logs
//        when(lpsService.runShellCommand(anyString(), anyString(), any(Duration.class)))
//                .thenReturn(null);
//
//        LpsSyncJobRequest req = new LpsSyncJobRequest();
////        req.setWorkingDir("./");
//        req.setCommand("ls");
//        req.setTimeoutMs(60_000L);
//
//        webTestClient.post()
//                .uri("/api/lps/anchors")
//                .contentType(MediaType.APPLICATION_JSON)
//                .bodyValue(req)
//                .exchange()
//                .expectStatus().is5xxServerError();
//
//        // Verify service was called
//        ArgumentCaptor<String> wdCaptor = ArgumentCaptor.forClass(String.class);
//        ArgumentCaptor<String> cmdCaptor = ArgumentCaptor.forClass(String.class);
//        ArgumentCaptor<Duration> timeoutCaptor = ArgumentCaptor.forClass(Duration.class);
//
//        verify(lpsService, times(1))
//                .runShellCommand(wdCaptor.capture(), cmdCaptor.capture(), timeoutCaptor.capture());
//
////        assertThat(wdCaptor.getValue()).isEqualTo(req.getWorkingDir());
//        assertThat(cmdCaptor.getValue()).isEqualTo(req.getCommand());
//        assertThat(timeoutCaptor.getValue()).isEqualTo(Duration.ofMillis(req.getTimeoutMs()));
//    }

}