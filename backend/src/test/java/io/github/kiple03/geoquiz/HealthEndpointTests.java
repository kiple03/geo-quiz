package io.github.kiple03.geoquiz;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Loads the whole application and checks which Actuator endpoints are reachable. */
@SpringBootTest
@AutoConfigureMockMvc
class HealthEndpointTests {

  @Autowired private MockMvcTester mvc;

  @Test
  void healthIsUpUnderApi() {
    assertThat(mvc.get().uri("/api/health"))
        .hasStatusOk()
        .bodyJson()
        .extractingPath("$.status")
        .isEqualTo("UP");
  }

  /** "/api" alone would be Actuator's discovery page, which lists the endpoints. */
  @ParameterizedTest
  @ValueSource(strings = {"/api", "/api/env", "/api/beans", "/api/info", "/actuator/health"})
  void otherActuatorEndpointsAreNotExposed(String path) {
    assertThat(mvc.get().uri(path)).hasStatus(HttpStatus.NOT_FOUND);
  }
}
