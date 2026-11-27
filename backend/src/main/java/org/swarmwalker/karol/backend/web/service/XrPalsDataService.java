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