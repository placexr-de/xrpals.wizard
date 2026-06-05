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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.swarmwalker.karol.backend.data.AnchorPosition;

@Service
public class LpsAnchorYamlWriterService {

    public void writeAnchors(Path targetFile, Map<Integer, AnchorPosition> anchors) throws IOException {
        Files.createDirectories(targetFile.getParent());

        StringBuilder sb = new StringBuilder();

        anchors.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> {
                    int id = entry.getKey();
                    AnchorPosition a = entry.getValue();

                    sb.append(id)
                      .append(": {x: ")
                      .append(a.getX())
                      .append(", y: ")
                      .append(a.getY())
                      .append(", z: ")
                      .append(a.getZ())
                      .append("}\n");
                });

        Files.writeString(
                targetFile,
                sb.toString(),
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING
        );
    }
}