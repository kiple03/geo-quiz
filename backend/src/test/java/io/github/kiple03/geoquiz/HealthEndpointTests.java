package io.github.kiple03.geoquiz;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Loads the whole application and checks the endpoints the skeleton exposes. */
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

  @Test
  void otherActuatorEndpointsAreNotExposed() {
    for (String path : new String[] {"/api/env", "/api/beans", "/api/info", "/actuator/health"}) {
      assertThat(mvc.get().uri(path)).hasStatus(HttpStatus.NOT_FOUND);
    }
  }
}
