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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Service;
import org.swarmwalker.karol.backend.XrpalsProperties;
import org.swarmwalker.karol.backend.data.AnchorPosition;
import org.swarmwalker.karol.backend.data.LpsAnchorPositionMessage;

@Service
public class XrPalsDataService {

    private final XrpalsProperties props;
    private final Path uploadDir;

    private static final DateTimeFormatter TS =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneOffset.UTC);

    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    public XrPalsDataService(XrpalsProperties props) {
        this.props = props;
        this.uploadDir = Path.of(props.getUploadsDir()).toAbsolutePath().normalize();
    }

    public void ensureUploadDir() throws IOException {
        Files.createDirectories(uploadDir);
    }

    public String timestampUtc() {
        return TS.format(Instant.now());
    }

    public Path originalPath(String timestamp) {
        return uploadDir.resolve(timestamp + ".yaml");
    }

    public Path convertedPath(String timestamp) {
        return uploadDir.resolve(timestamp + ".xrpals.yaml");
    }

    public LpsAnchorPositionMessage convertToInlineYaml(Path inputYaml, Path outputInlineYaml) throws IOException {
        String yamlStr = Files.readString(inputYaml, StandardCharsets.UTF_8);

        // Parse: { 0: {x:..,y:..,z:..}, 1: {...}, ... }
        Map<Integer, AnchorPosition> points = yamlMapper.readValue(
                yamlStr,
                new TypeReference<Map<Integer, AnchorPosition>>() {
                }
        );

        // Keep stable order like Rust's BTreeMap
        Map<Integer, AnchorPosition> sorted = new TreeMap<>(points);

        StringBuilder out = new StringBuilder();
        for (Map.Entry<Integer, AnchorPosition> e : sorted.entrySet()) {
            AnchorPosition p = e.getValue();
            out.append(e.getKey())
                    .append(": {x: ").append(p.getX())
                    .append(", y: ").append(p.getY())
                    .append(", z: ").append(p.getZ())
                    .append("}\n");
        }

        Files.writeString(outputInlineYaml, out.toString(), StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        return new LpsAnchorPositionMessage(points);
    }
}