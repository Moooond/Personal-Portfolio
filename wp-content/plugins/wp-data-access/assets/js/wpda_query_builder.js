const TAB_DEFAULT_LABEL = 'New Query';

var editors = {};
var tabIndex = 0;
var tabs = [];

function tabActivate(activeIndex) {
	jQuery(".wpda_query_builder").hide();
	jQuery("#wpda_query_builder_" + activeIndex).show();

	jQuery(".nav-tab").removeClass("nav-tab-active");
	jQuery("#wpda_query_builder_label_" + activeIndex).addClass("nav-tab-active");
}

function tabNew(tabName = TAB_DEFAULT_LABEL, query = '', schema_name = wpda_default_database) {
	tabIndex++;
	if (tabName===TAB_DEFAULT_LABEL) {
		tabName += " (" + tabIndex + ")";
		dbsName = '';
	} else {
		dbsName = tabName;
	}

	tabLabel = `
		<a id="wpda_query_builder_label_${tabIndex}" class="nav-tab wpda_query_builder_label" data-id="${tabIndex}" href="javascript:void(0)">
			<span id="wpda_query_builder_label_value_${tabIndex}" 
				  class="wpda_query_builder_label_value"
				  contenteditable="true" 
				  data-dbs-name="${dbsName}"
				  onclick="tabActivate('${tabIndex}')"
				  ondblclick="selectContent(event)"
			>${tabName}</span>
			<span id="tab-${tabIndex}-icon"
				  class="dashicons dashicons-dismiss icon_close"
				  style="vertical-align: middle"
				  onclick="tabClose('${tabIndex}')"
			></span>
		</a>`;
	jQuery("#wpda_query_builder nav.nav-tab-wrapper").append(tabLabel);
	document.getElementById("wpda_query_builder_label_value_" + tabIndex).ondblclick = function(){
		event.preventDefault();
		var sel = window.getSelection();
		var range = document.createRange();
		range.selectNodeContents(this);
		sel.removeAllRanges();
		sel.addRange(range);
	};

	tabContent = `
		<div id="wpda_query_builder_${tabIndex}" class="wpda_query_builder">
			<div class="wpda_query_builder_taskbar">
				<label>
					Select database
					<select id="wpda_query_builder_dbs_${tabIndex}">${wpda_databases}</select>
				</label>
				<span class="wpda_query_builder_wordpress_protect">
					<label>
						<input id="wpda_query_builder_wordpress_protect_${tabIndex}" type="checkbox" checked />
						Protect WordPress tables
					</label>
				</span>
				<span class="wpda_query_builder_actions">
					<label>
						<input id="use_max_rows_${tabIndex}" type="checkbox" checked/>
						Max rows:
						<input id="max_rows_${tabIndex}" type="number" value="100" min="1" onblur="if (jQuery(this).val()==='') { jQuery(this).val(100) }" style="width: 100px"/>
					</label>
					<a href="javascript:void(0)" onclick="executeQuery('${tabIndex}')" class="wpda_tooltip button button-primary" title="Execute query">
						<span class="material-icons wpda_icon_on_button">play_arrow</span> Execute</a>
					<span id="executing_query_${tabIndex}" style="display: none">
						<img src="${wpda_loader_url}" class="wpda_spinner" />
					</span>
					<a href="javascript:void(0)" onclick="saveQuery('${tabIndex}')" class="wpda_tooltip button button-primary" title="Save query">
						<span class="material-icons wpda_icon_on_button">cloud_upload</span> Save</a>
						
					<a href="javascript:void(0)" class="wpda_tooltip button button-primary wpda-query-help" title="Use / to separate multiple SQL commands:

select * from dept
/
select * from emp
/

The / must be on an empty line
">?</a>
				</span>
			</div>
			<div class="wpda_query_builder_sql">
				<textarea id="wpda_query_builder_sql_${tabIndex}">${query}</textarea>
			</div>
			<div id="wpda_query_builder_tabs_${tabIndex}" class="wpda_query_builder_tabs" style="display: none"></div>
			${queryResult(tabIndex)}
		</div>`;
	jQuery("#wpda_query_builder").append(tabContent);
	editors['tab' + tabIndex] = wp.codeEditor.initialize(jQuery('#wpda_query_builder_sql_' + tabIndex), cm_settings);

	jQuery("#wpda_query_builder_dbs_" + tabIndex).val(schema_name);
	jQuery( '.wpda_tooltip' ).tooltip();

	tabActivate(tabIndex);
}

function queryResult(activeIndex) {
	return `
		<div id="wpda_query_builder_menubar_${activeIndex}" class="wpda_query_builder_menubar" style="display: none">
			<label>Export to</label>
			<button class="button button-primary" onclick="exportTable('CSV', ${activeIndex})">CSV</button>
			<button class="button button-primary" onclick="exportTable('JSON', ${activeIndex})">JSON</button>
			<button class="button button-primary" onclick="exportTable('XML', ${activeIndex})">XML</button>
		</div>
		<div id="wpda_query_builder_result_${activeIndex}" class="wpda_query_builder_result"></div>
		<div id="wpda_query_builder_statusbar_${activeIndex}" style="display: none" class="wpda_query_builder_statusbar">
			<a href="javascript:void(0)" onclick="jQuery('#wpda_query_builder_viewer_${activeIndex}').toggle(); jQuery('html, body').animate({ scrollTop: jQuery(window).height()-200}, 600);" class="wpda_tooltip button button-primary" title="View raw output">
				<span class="material-icons wpda_icon_on_button">code</span></a>
			<span class="wpda_query_builder_statusbar_message"></span>
		</div>
		<div id="wpda_query_builder_viewer_${activeIndex}" style="display: none" class="wpda_query_builder_viewer">
			<pre id="wpda_query_builder_json_${activeIndex}"></pre>
		</div>
	`;
}

function tabClose(activeIndex) {
	jQuery("#wpda_query_builder_label_" + activeIndex).remove();
	jQuery("#wpda_query_builder_" + activeIndex).remove();
	delete editors['tab' + activeIndex];
	if (jQuery(".wpda_query_builder").length>0) {
		if (jQuery(".nav-tab-active").data("id")===undefined) {
			tabActivate(jQuery(".nav-tab").data("id"));
		}
	} else {
		tabNew();
	}
}

function tabOpen() {
	tabNew(
		jQuery("#wpda_query_builder_open_select").find(":selected").text(),
		jQuery("#wpda_query_builder_open_select").find(":selected").data("sql"),
		jQuery("#wpda_query_builder_open_select").find(":selected").data("dbs")
	);
	closeQuery();
}

function tabOpenAll() {
	jQuery("#wpda_query_builder_open_select option").each(
		function() {
			tabNew(
				jQuery(this).text(),
				jQuery(this).data("sql"),
				jQuery(this).data("dbs")
			);
			closeQuery();
		}
	);
}

function showData(activeIndex, msg) {
	if ( msg.tabs.length > 0 ) {
		// Multiple SQL commands
		showTabs(activeIndex, msg);
	} else {
		// Single SQL command
		showRows(activeIndex, msg);
	}
}

function showTabs(activeIndex, msg) {
	var ul = jQuery("<ul/>");
	for (var i=0; i<msg.tabs.length; i++) {
		if (msg.tabs[i]['status']===undefined || msg.tabs[i]['status']['last_query']===undefined) {
			sql = "SQL ERROR";
		} else {
			sql = msg.tabs[i].status.last_query;
		}
		ul.append(jQuery("<li/>")
			.append(jQuery("<a/>", { "href": "#tab-" + i, "title": sql, "class": "wpda_tooltip" })
			.html((i+1) + ". sql cmd <span class='dashicons dashicons-database-view'></span>")));
	}
	var tabs = jQuery("<div/>", { "id": "tabs" }).append(ul);

	for (var i=0; i<msg.tabs.length; i++) {
		var tabResultDiv = queryResult("" + activeIndex + i);
		var style = i===0 ? "block" : "none";
		tabs.append(jQuery("<div/>", { "id": "tab-"+i, "style": "display:"+style })
			.append(tabResultDiv));
	}
	jQuery("#wpda_query_builder_tabs_" + activeIndex).empty().append(tabs);
	jQuery("#wpda_query_builder_tabs_" + activeIndex).show();

	for (var i=0; i<msg.tabs.length; i++) {
		showRows("" + activeIndex + i, msg.tabs[i]);
	}
	jQuery("div#tabs").tabs();
	jQuery('.wpda_tooltip').tooltip();
}

function showRows(activeIndex, msg) {
	if (msg.rows!==undefined && msg.rows.length>0) {
		rows = msg.rows;
		first_row = rows[0];
		header = '<tr>';
		for (var col in first_row) {
			header += '<th>' + col + '</th>';
		}
		header += '</tr>';
		body = '';
		for (var i=0; i<rows.length; i++) {
			body += '<tr>';
			for (var col in rows[i]) {
				body += '<td>' + rows[i][col] + '</td>';
			}
			body += '</tr>';
		}
		table =
			jQuery('<table class="wpda_query_builder_table" data-id="' + activeIndex + '"/>')
			.append(jQuery('<thead/>').append(header))
			.append(jQuery('<tbody/>').append(body));
		jQuery("#wpda_query_builder_menubar_" + activeIndex).show();
		jQuery("#wpda_query_builder_result_" + activeIndex).html(table);
		rowLabel = rows.length===1 ? "row" : "rows";
		html = rows.length + " " + rowLabel;
		if (msg.status.queries!==null) {
			html += " (" + msg.status.queries[msg.status.num_queries - 1][1].toFixed(5) + " sec)";
		}
		jQuery("#wpda_query_builder_statusbar_" + activeIndex + " span.wpda_query_builder_statusbar_message").html(
			html
		);
		jQuery("#wpda_query_builder_statusbar_" + activeIndex).show();
		jQuery("#wpda_query_builder_json_" + activeIndex).jsonViewer(msg.status);
		jQuery("#wpda_query_builder_json_" + activeIndex + " ul li a.json-toggle").click();

		setResultDivHeight(activeIndex);
	} else {
		if (msg.status!==undefined && typeof msg.status==="object" && msg.status!==null) {
			rowLabel = msg.status.rows_affected===1 ? "row" : "rows";
			html = "Query OK, " + msg.status.rows_affected + " " + rowLabel + " affected";
			if (msg.status.queries!==null) {
				html += " (" + msg.status.queries[msg.status.num_queries-1][1].toFixed(5) + " sec)"
			}
			jQuery("#wpda_query_builder_result_" + activeIndex).html(
				html
			);

			jQuery("#wpda_query_builder_statusbar_" + activeIndex).show();
			jQuery("#wpda_query_builder_json_" + activeIndex).jsonViewer(msg.status);
			jQuery("#wpda_query_builder_json_" + activeIndex + " ul li a.json-toggle").click();
		} else {
			// msg contains error message
			jQuery("#wpda_query_builder_result_" + activeIndex).html(msg);
		}
	}
}

function setResultDivHeight(activeIndex) {
	viewHeight = jQuery(window).height();
	positionX = jQuery("#wpda_query_builder_result_" + activeIndex).offset().top;
	if (positionX===0) {
		positionX = viewHeight/2;
	}
	divHeight = viewHeight - positionX - 140;
	jQuery("#wpda_query_builder_result_" + activeIndex + " table.wpda_query_builder_table tbody").height(divHeight);
}

function showError(activeIndex,msg) {
	jQuery("#wpda_query_builder_menubar_" + activeIndex).hide();
	jQuery("#wpda_query_builder_result_" + activeIndex).html(msg.responseText);
	jQuery("#wpda_query_builder_statusbar_" + activeIndex).hide();
}

function executeQuery(activeIndex) {
	// Execute query
	cm = editors['tab' + activeIndex].codemirror;
	cm.save();

	sql = jQuery("#wpda_query_builder_sql_" + activeIndex).val();
	limit = '';

	if (jQuery("#use_max_rows_" + activeIndex).is(":checked")) {
		limit = jQuery("#max_rows_" + activeIndex).val();
	}

	jQuery("#executing_query_" + activeIndex).show();

	jQuery.ajax({
		method: 'POST',
		url: wpda_home_url + "/wp-admin/admin.php?action=wpda_query_builder_execute_sql",
		data: {
			wpda_wpnonce: wpda_wpnonce,
			wpda_schemaname: jQuery("#wpda_query_builder_dbs_" + activeIndex).val(),
			wpda_sqlquery: sql,
			wpda_sqllimit: limit,
			wpda_protect: jQuery("#wpda_query_builder_wordpress_protect_" + activeIndex).is(":checked")
		}
	}).done(
		function (msg) {
			jQuery("#executing_query_" + activeIndex).hide();
			showData(activeIndex, msg);
		}
	).fail(
		function (msg) {
			jQuery("#executing_query_" + activeIndex).hide();
			showError(activeIndex, msg);
		}
	);
}

function saveQuery(activeIndex) {
	// Save query
	cm = editors['tab' + activeIndex].codemirror;
	cm.save();

	jQuery.ajax({
		method: 'POST',
		url: wpda_home_url + "/wp-admin/admin.php?action=wpda_query_builder_save_sql",
		data: {
			wpda_wpnonce: wpda_wpnonce,
			wpda_schemaname: jQuery("#wpda_query_builder_dbs_" + activeIndex).val(),
			wpda_sqlqueryname: jQuery("#wpda_query_builder_label_value_" + activeIndex).html(),
			wpda_sqlqueryname_old: jQuery("#wpda_query_builder_label_value_" + activeIndex).data("dbs-name"),
			wpda_sqlquery: jQuery("#wpda_query_builder_sql_" + activeIndex).val()
		}
	}).done(
		function (msg) {
			jQuery("#wpda_query_builder_label_value_" + activeIndex)
			.attr("data-dbs-name", jQuery("#wpda_query_builder_label_value_" + activeIndex).text());
		}
	).fail(
		function (msg) {
			console.log(activeIndex, msg);
		}
	);
}

function openQuery() {
	activeDbsNames = [];
	jQuery(".wpda_query_builder_label_value").each(
		function() {
			activeDbsNames.push(jQuery(this).data("dbs-name"));
		}
	);

	jQuery.ajax({
		method: 'POST',
		url: wpda_home_url + "/wp-admin/admin.php?action=wpda_query_builder_open_sql",
		data: {
			wpda_wpnonce: wpda_wpnonce,
			wpda_exclude: activeDbsNames.join(",")
		}
	}).done(
		function (msg) {
			jQuery("#wpda_query_builder_open_select").find("option").remove();
			if (!Array.isArray(msg.data)) {
				for (var queryName in msg.data) {
					jQuery("#wpda_query_builder_open_select")
					.append(
						jQuery("<option/>", {
							value: queryName,
							text: queryName
						})
						.attr("data-dbs", msg.data[queryName].schema_name)
						.attr("data-sql", msg.data[queryName].query)
					);
				}
				jQuery("#wpda_query_builder_open_select").attr("disabled", false);
				jQuery("#wpda_query_builder_open_open").attr("disabled", false);
				jQuery("#wpda_query_builder_open_openall").attr("disabled", false);
				jQuery("#wpda_query_builder_open_delete").attr("disabled", false);
			} else {
				jQuery("#wpda_query_builder_open_select")
				.append(
					jQuery("<option/>", {
						value: "",
						text: "Nothing found..."
					})
				);
				jQuery("#wpda_query_builder_open_select").attr("disabled", true);
				jQuery("#wpda_query_builder_open_open").attr("disabled", true);
				jQuery("#wpda_query_builder_open_openall").attr("disabled", true);
				jQuery("#wpda_query_builder_open_delete").attr("disabled", true);
			}
		}
	).fail(
		function (msg) {
			console.log(msg);
		}
	);

	jQuery("#wpda_query_builder_open").show();
}

function closeQuery() {
	jQuery("#wpda_query_builder_open").hide();
}

function deleteQuery() {
	if ( confirm("Delete query? This action cannot be undone!") ) {
		wpda_sqlqueryname = jQuery("#wpda_query_builder_open_select").find(":selected").text();

		jQuery.ajax({
			method: 'POST',
			url: wpda_home_url + "/wp-admin/admin.php?action=wpda_query_builder_delete_sql",
			data: {
				wpda_wpnonce: wpda_wpnonce,
				wpda_sqlqueryname: wpda_sqlqueryname
			}
		}).done(
			function (msg) {
				console.log(msg);
				closeQuery();
			}
		).fail(
			function (msg) {
				console.log(msg);
			}
		);
	}
}

function exportTable(exportType, tabIndex) {
	switch (exportType) {
		case "CSV":
			downloadCSV(
				jQuery("#wpda_query_builder_result_" + tabIndex + " table").html(),
				jQuery("#wpda_query_builder_label_value_" + tabIndex).text() + ".csv"
			);
			break;
		case "JSON":
			downloadJSON(
				jQuery("#wpda_query_builder_result_" + tabIndex + " table").html(),
				jQuery("#wpda_query_builder_label_value_" + tabIndex).text() + ".json"
			);
			break;
		case "XML":
			downloadXML(
				jQuery("#wpda_query_builder_result_" + tabIndex + " table").html(),
				jQuery("#wpda_query_builder_label_value_" + tabIndex).text() + ".xml"
			);
	}
}

function downloadCSV(html, fileName) {
	csv = [];
	rows = jQuery(html).find("tr");
	for (i=0; i<rows.length; i++) {
		row = [];
		cols = jQuery(rows[i]).find("td, th");
		for (j=0; j<cols.length; j++) {
			row.push(cols[j].innerText);
		}
		csv.push(row);
	}
	downloadExport(fileName, "text/csv", encodeURIComponent(csv.join("\n")));
}

function createXML(html, fileName) {
	headerCols = [];
	header = jQuery(html).find("tr th");
	body = jQuery(html)[1];
	bodyRows = jQuery(body).find("tr");
	table = jQuery("<table/>");
	for (i=0; i<header.length; i++) {
		headerCols.push(header[i].innerText);
	}
	for (i=0; i<bodyRows.length; i++) {
		bodyCols = jQuery(bodyRows[i]).find("td");
		row = jQuery("<rows/>");
		for (j=0; j<bodyCols.length; j++) {
			row.append(jQuery("<" + headerCols[j] + "/>").text(bodyCols[j].innerText));
		}
		table.append(row);
	}
	xml = jQuery("<xml/>").append(table);
	return jQuery.parseXML(xml[0].outerHTML);
}

function downloadJSON(html, fileName) {
	xmlDoc = createXML(html, fileName);
	json = jQuery.xml2json(new XMLSerializer().serializeToString(xmlDoc.documentElement));
	downloadExport(fileName, "text/json", JSON.stringify(json));
}

function downloadXML(html, fileName) {
	xmlDoc = createXML(html, fileName);
	downloadExport(fileName, "text/xml", new XMLSerializer().serializeToString(xmlDoc.documentElement));
}

function downloadExport(fileName, mimeType, content) {
	download = jQuery("<a/>", {
		href: "data:" + mimeType + ";charset=utf-8," + content,
		download: fileName
	}).appendTo('body');
	download[0].click();
	download.remove();
}
