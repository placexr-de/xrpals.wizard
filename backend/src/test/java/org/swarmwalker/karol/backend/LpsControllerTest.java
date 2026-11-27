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