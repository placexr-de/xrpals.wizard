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
package org.swarmwalker.karol.backend.web.service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.swarmwalker.karol.backend.web.dto.LpsSyncJobResult;

@Service
public class LpsSyncJobStore {

    private static final Duration TTL = Duration.ofMinutes(10);

    private static class Entry {
        final LpsSyncJobResult result;
        final Instant createdAt;

        Entry(LpsSyncJobResult result, Instant createdAt) {
            this.result = result;
            this.createdAt = createdAt;
        }
    }

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();

    /**
     * Updates results with same jobId.
     *
     * @param result
     */
    public void put(LpsSyncJobResult result) {
        store.put(result.getJobId(), new Entry(result, Instant.now()));
    }

    public Optional<LpsSyncJobResult> get(String jobId) {
        Entry e = store.get(jobId);
        if (e == null) return Optional.empty();

        // Lazy expiry on read
        if (isExpired(e)) {
            store.remove(jobId);
            return Optional.empty();
        }
        return Optional.of(e.result);
    }

    public List<String> listJobIds() {
        // Return non-expired IDs
        Instant now = Instant.now();
        List<String> ids = new ArrayList<>();
        for (var entry : store.entrySet()) {
            if (Duration.between(entry.getValue().createdAt, now).compareTo(TTL) < 0) {
                ids.add(entry.getKey());
            }
        }
        return ids;
    }

    @Scheduled(fixedDelay = 5 * 60_000) // every 5*60s
    public void cleanupExpired() {
        Instant now = Instant.now();
        for (var entry : store.entrySet()) {
            if (Duration.between(entry.getValue().createdAt, now).compareTo(TTL) >= 0) {
                store.remove(entry.getKey());
            }
        }
    }

    private boolean isExpired(Entry e) {
        return Duration.between(e.createdAt, Instant.now()).compareTo(TTL) >= 0;
    }
}