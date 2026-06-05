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