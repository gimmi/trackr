package com.github.gimmi.trackr.web;

import com.github.gimmi.trackr.TestDbHelpers;
import com.github.gimmi.trackr.configuration.AppServletContextListener;
import com.google.inject.servlet.GuiceFilter;
import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.ClientResponse;
import com.sun.jersey.api.client.config.ClientConfig;
import com.sun.jersey.api.client.config.DefaultClientConfig;
import org.codehaus.jackson.jaxrs.JacksonJsonProvider;
import org.codehaus.jackson.node.ArrayNode;
import org.codehaus.jackson.node.ObjectNode;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.DefaultServlet;
import org.eclipse.jetty.servlet.FilterMapping;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.util.List;
import java.util.Map;

import static org.hamcrest.CoreMatchers.equalTo;
import static org.junit.Assert.assertThat;

public class ItemResourceTest {
	private Server server;
	private Client client;

	@Before
	public void before() throws Exception {
		TestDbHelpers.rebuildDatabase();
		server = buildServer();
		server.start();

		ClientConfig clientConfig = new DefaultClientConfig();
		clientConfig.getClasses().add(JacksonJsonProvider.class);
		client = Client.create(clientConfig);
	}

	private Server buildServer() {
		Server server = new Server(8080);

		ServletContextHandler servletContextHandler = new ServletContextHandler(ServletContextHandler.SESSIONS);
		servletContextHandler.setContextPath("/");
		servletContextHandler.addEventListener(new AppServletContextListener(TestDbHelpers.getTestJpaProps()));
		servletContextHandler.addFilter(GuiceFilter.class, "/*", FilterMapping.DEFAULT);

		// This is a workaround
		// https://groups.google.com/d/msg/google-guice/lMmVPQQ2Soc/0QoekenBnYoJ
		// https://bugs.eclipse.org/bugs/show_bug.cgi?id=393738
		servletContextHandler.addServlet(DefaultServlet.class, "/");

		server.setHandler(servletContextHandler);
		return server;
	}

	@After
	public void after() throws Exception {
		server.stop();
		server.join();
	}

	@Test
	public void should_get_all_items() {
		TestDbHelpers.execSql("INSERT INTO ITEM SET ID = 'id1', TITLE = 'item 1 title', VERSION = 1");

		ClientResponse resp = client.resource("http://localhost:8080/api/items")
				.accept("application/json")
				.get(ClientResponse.class);

		assertThat(resp.getStatus(), equalTo(200));
		ArrayNode items = resp.getEntity(ArrayNode.class);
		assertThat(items.size(), equalTo(1));
		assertThat(items.get(0).findPath("id").getTextValue(), equalTo("id1"));
	}

	@Test
	public void should_create_item() {
		ClientResponse resp = client.resource("http://localhost:8080/api/items")
				.accept("application/json")
				.type("application/json")
				.post(ClientResponse.class, "{ title: 'item title' }");

		assertThat(resp.getStatus(), equalTo(201));

		List<Map<String, Object>> rows = TestDbHelpers.query("SELECT * FROM ITEM");
		assertThat(rows.size(), equalTo(1));
		assertThat(rows.get(0).get("TITLE").toString(), equalTo("item title"));

		String itemLocation = resp.getHeaders().getFirst("Location");
		assertThat(itemLocation, equalTo("http://localhost:8080/api/items/" + rows.get(0).get("ID").toString()));
	}

	@Test
	public void should_get_item_by_id() {
		TestDbHelpers.execSql("INSERT INTO ITEM SET ID = 'id1', TITLE = 'item 1 title', VERSION = 1");

		ClientResponse resp = client.resource("http://localhost:8080/api/items/id1")
				.accept("application/json")
				.get(ClientResponse.class);

		assertThat(resp.getStatus(), equalTo(200));
		ObjectNode item = resp.getEntity(ObjectNode.class);
		assertThat(item.findPath("id").getTextValue(), equalTo("id1"));
	}
}
