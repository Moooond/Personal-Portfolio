<?php

namespace WPDataAccess\Query_Builder {

	use WPDataAccess\Connection\WPDADB;
	use WPDataAccess\Data_Dictionary\WPDA_Dictionary_Lists;
	use WPDataAccess\WPDA;

	class WPDA_Query_Builder {

		const EXPLAIN_COMMANDS  = [ 'select', 'delete', 'insert', 'replace', 'update' ];
		const EXPLAIN_PROTECTED = [ 'delete', 'insert', 'replace', 'update' ];

		protected $databases        = [];
		protected $default_database = '';
		protected $wpnonce          = '';

		public function __construct() {
			$dbs = WPDA_Dictionary_Lists::get_db_schemas();
			foreach ( $dbs as $db ) {
				$this->databases[] = $db['schema_name'];
			}

			$this->default_database = WPDA::get_user_default_scheme();

			if ( function_exists( 'wp_create_nonce' ) ) {
				$this->wpnonce = wp_create_nonce( 'wpda-query-builder-' . WPDA::get_current_user_id() );
			}
		}

		public function show() {
			$this->html();
			$this->css();
			$this->js();
		}

		protected function html() {
			?>
			<div class="wrap">
				<h1 class="wp-heading-inline">
					<span style="vertical-align:top;">
						Query Builder</span>
					<span>
						<a href="https://wpdataaccess.com/docs/documentation/query-builder/getting-started/" target="_blank" class="wpda_tooltip" title="Plugin Help - opens in a new tab or window">
							<span class="material-icons" style="font-size: 26px; vertical-align: sub;">help</span></a>
					</span>
					<span>
						<a href="https://wpdataaccess.com/docs/documentation/query-builder/tutorials/" target="_blank"
						   class="wpda_tooltip" title="Tutorials - opens in a new tab or window">
							<span class="material-icons" style="font-size: 26px; vertical-align: sub;">video_library</span></a>

					</span>
					<span>
						<a href="javascript:void(0)" class="wpda_tooltip" title="Create new query" onclick="tabNew()">
							<span class="material-icons" style="font-size: 26px; vertical-align: sub;">add_circle</span></a>
					</span>
					<span>
						<a href="javascript:void(0)" class="wpda_tooltip" title="Open existing query" onclick="openQuery()">
							<span class="material-icons" style="font-size: 26px; vertical-align: sub;">arrow_drop_down_circle</span></a>
					</span>
				</h1>
				<div id="wpda_query_builder_open" style="display: none">
					<fieldset class="wpda_fieldset" style="position:relative">
						<legend>
							Queries stored for user <?php echo esc_attr( WPDA::get_current_user_login() ); ?>
						</legend>
						<label>
							Select
						</label>
						<select id="wpda_query_builder_open_select"></select>
						<a id="wpda_query_builder_open_open" 
						   href="javascript:void(0)" 
						   onclick="tabOpen()" 
						   class="wpda_tooltip button button-primary" 
						   title="Open query in new tab">
							<span class="material-icons wpda_icon_on_button">folder_open</span> Open selected</a>
						<a id="wpda_query_builder_open_openall"
						   href="javascript:void(0)" 
						   onclick="tabOpenAll()" 
						   class="wpda_tooltip button button-primary" 
						   title="Open all stored queries in new tabs">
							<span class="material-icons wpda_icon_on_button">folder_open</span> Open all</a>
						<a id="wpda_query_builder_open_delete" 
						   href="javascript:void(0)" 
						   onclick="deleteQuery()" 
						   class="wpda_tooltip button button-primary" 
						   title="Delete query">
							<span class="material-icons wpda_icon_on_button">delete</span> Delete selected</a>
						<button class=" wpda-icon-close" onclick="closeQuery()">
							<span class="material-icons wpda_icon_on_button">closed</span></a>
						</button>
					</fieldset>
				</div>
				<div id="wpda_query_builder">
					<nav class="nav-tab-wrapper">
					</nav>
				</div>
			</div>
			<?php
		}

		protected function css() {
			// Overwrite default style
			?>
			<style type="text/css">
                .ui-corner-all, .ui-corner-top, .ui-corner-right, .ui-corner-tr, .ui-corner-left, .ui-corner-tl {
                    border-radius: 0 !important;
                }
                .ui-widget.ui-widget-content {
					border: none;
				}
                .wpda_query_builder_tabs .ui-widget-content {
					background: none;
					color: inherit;
				}
                .ui-widget-header {
					font-weight: normal;
					background: none;
					border: none;
                    border-bottom: 1px solid #c3c4c7;
				}
                .ui-tabs .ui-tabs-nav li.ui-tabs-active .ui-tabs-anchor, .ui-tabs .ui-tabs-nav li.ui-state-disabled .ui-tabs-anchor, .ui-tabs .ui-tabs-nav li.ui-tabs-loading .ui-tabs-anchor {
                    cursor: pointer;
                }
                .ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default, .ui-button, html .ui-button.ui-state-disabled:hover, html .ui-button.ui-state-disabled:active {
                    border: 1px solid #c3c4c7;
                    font-weight: bold;
                    color: #000 !important;
                    background: #dcdcde !important;
                }
                .ui-state-default:hover {
                    background: #f0f0f1 !important;
				}
                .ui-state-active, .ui-widget-content .ui-state-active, .ui-widget-header .ui-state-active, a.ui-button:active, .ui-button:active, .ui-button.ui-state-active:hover {
                    border: 1px solid #c3c4c7;
                    border-bottom: none;
                    font-weight: bold;
                    color: #000 !important;
                    background: #f0f0f1 !important;
                }
				.ui-tabs-anchor {
                    color: #50575e !important;
				}
				.ui-tabs-anchor span.dashicons {
					padding-left: 5px;
				}
				.ui-tabs .ui-tabs-panel {
					padding: 0;
					font-family: inherit;
					font-size: inherit;
				}
                .ui-tabs .ui-tabs-nav li {
					margin-left: 4px;
				}
                .ui-tabs .ui-tabs-nav .ui-tabs-anchor {
                    line-height: 20px;
                }
			</style>
			<?php
		}

		protected function js() {
			?>
				<script type="application/javascript">
					var wpda_default_database = '<?php echo esc_attr( $this->default_database ); ?>';
					var wpda_databases = '';
					<?php
						$database_options = '';
						foreach ( $this->databases as $database ) {
							$database_options .= '<option value="' . $database . '">' . $database . '</option>';
						}
						echo "wpda_databases = '{$database_options}';";
					?>
					var wpda_home_url = "<?php echo get_home_url(); ?>";
					var wpda_wpnonce = "<?php echo esc_attr( $this->wpnonce ); ?>";
					var wpda_loader_url = "<?php echo plugins_url( '../../assets/images/loading.gif', __FILE__ ); ?>";

					jQuery(
						function() {
							tabNew();
							jQuery('#wpda_query_builder nav').sortable();
							jQuery( '.wpda_tooltip' ).tooltip();
						}
					);
				</script>
			<?php
		}

		public function execute() {
			$response = [
				'rows'   => [],
				'tabs'	 => [],
				'status' => null
			];

			$this->ajax_header();

			// Only for admins
			if (
				current_user_can( 'manage_options' ) &&
				isset(
					$_POST['wpda_wpnonce'],
					$_POST['wpda_schemaname'],
					$_POST['wpda_sqlquery'],
					$_POST['wpda_sqllimit'],
					$_POST['wpda_protect']
				)
			) {
				$wpda_wpnonce    = sanitize_text_field( wp_unslash( $_POST['wpda_wpnonce'] ) ); // input var okay.
				$wpda_schemaname = sanitize_text_field( wp_unslash( $_POST['wpda_schemaname'] ) ); // input var okay.
				$wpda_sqlquery   = wp_unslash( $_POST['wpda_sqlquery'] ); // input var okay.
				$wpda_sqllimit   = sanitize_text_field( wp_unslash( $_POST['wpda_sqllimit'] ) ); // input var okay.
				$wpda_protect    = sanitize_text_field( wp_unslash( $_POST['wpda_protect'] ) ); // input var okay.

				// Check query
				if ( $this->check_query( $wpda_protect, $wpda_schemaname, $wpda_sqlquery ) ) {
					if ( wp_verify_nonce( $wpda_wpnonce, 'wpda-query-builder-' . WPDA::get_current_user_id() ) ) {
						// Execute query
						$wpdadb   = WPDADB::get_db_connection( $wpda_schemaname );
						$suppress = $wpdadb->suppress_errors( true );

						$sqllines = explode( "\n", $wpda_sqlquery );
						$sqlcmds  = [];
						$start_i  = 0;
						for ( $i = 0; $i < sizeof( $sqllines ); $i++ ) {
							if ( '/' === trim( $sqllines[ $i ] ) ) {
								$sql = '';
								for ( $j = $start_i; $j < $i; $j++ ) {
									if ( '' !== trim( $sqllines[ $j ] ) ) {
										$sql .= "{$sqllines[ $j ]} ";
									}
								}
								$sqlcmds[] = $sql;
								$start_i   = $i + 1;
							}
						}

						$tabs = [];
						$rows = [];

						if ( sizeof( $sqlcmds ) > 1 ) {
							// Process multiple SQL commands
							for ( $i = 0; $i < sizeof( $sqlcmds); $i++ ) {
								if (
									'' !== $wpda_sqllimit &&
									'select' === strtolower( substr( $sqlcmds[ $i ], 0, 6 ) )
								) {
									$sqlcmds[ $i ] .= " limit {$wpda_sqllimit} ";
								}
								$rows_multisql = $wpdadb->get_results( $sqlcmds[ $i ] );
								if ( '' === $wpdadb->last_error ) {
									$tabs[] = [
											'rows'   => $rows_multisql,
											'status' => clone $wpdadb
										];
								} else {
									$tabs[] =
										'<strong>WordPress database error:</strong> [' . $wpdadb->last_error . ']' .
										'<br/>' .
										"<code>{$sqlcmds[ $i ]}</code>";
								}
							}
						} else {
							// Process single SQL command
							if (
								'' !== $wpda_sqllimit &&
								'select' === strtolower( substr( $wpda_sqlquery, 0, 6 ) )
							) {
								$wpda_sqlquery .= " limit {$wpda_sqllimit} ";
							}
							$rows = $wpdadb->get_results( $wpda_sqlquery );
						}

						$wpdadb->suppress_errors( $suppress );
						if ( '' === $wpdadb->last_error ) {
							$response['rows']   = $rows;
							$response['tabs']   = $tabs;
							$response['status'] = $wpdadb;
							echo json_encode( $response );
						} else {
							echo '<strong>WordPress database error:</strong> [' . $wpdadb->last_error . ']' .
								'<br/>' .
								"<code>{$wpda_sqlquery}</code>";
						}
					} else {
						$response['status'] = '<strong>WP Data Access error:</strong> Token expired';
						echo json_encode( $response );
					}
				} else {
					$response['status'] = '<strong>WP Data Access error:</strong> Query not allowed - WordPress tables are protected';
					echo json_encode( $response );
				}
			} else {
				$response['status'] = '<strong>WP Data Access error:</strong> Query execution failed';
				echo json_encode( $response );
			}
		}

		private function check_query( $wpda_protect, $wpda_schemaname, $wpda_sqlquery ) {
			$sql_parts = explode( ' ', trim( $wpda_sqlquery ) );
			if (
				isset( $sql_parts[0] ) &&
				isset( $sql_parts[2] ) &&
				WPDA::is_wp_table( $sql_parts[2] ) &&
				(
					'drop' === strtolower( $sql_parts[0] ) ||
					'alter' === strtolower( $sql_parts[0] ) ||
					'rename' === strtolower( $sql_parts[0] ) ||
					'truncate' === strtolower( $sql_parts[0] )
				)
			) {
				return false;
			}

			if (
				isset( $sql_parts[0] ) &&
				isset( $sql_parts[1] ) &&
				WPDA::is_wp_table( $sql_parts[1] ) &&
				(
					'truncate' === strtolower( $sql_parts[0] )
				)
			) {
				return false;
			}

			if (
				'false' !== $wpda_protect &&
				isset( $sql_parts[0] ) &&
				in_array( strtolower( $sql_parts[0] ), self::EXPLAIN_COMMANDS )
			) {
				$wpdadb   = WPDADB::get_db_connection( $wpda_schemaname );
				$suppress = $wpdadb->suppress_errors( true );
				$explain  = $wpdadb->get_results( "explain {$wpda_sqlquery}", 'ARRAY_A' );
				$wpdadb->suppress_errors( $suppress );
				foreach ( $explain as $check ) {
					if (
						in_array( strtolower( $check['select_type'] ), self::EXPLAIN_PROTECTED ) &&
						WPDA::is_wp_table( $check['table'] )
					) {
						return false;
					}
				}
			}

			return true;
		}

		public function save() {
			$response = [
				'status' => null
			];

			$this->ajax_header();

			// Only for admins
			if (
				current_user_can( 'manage_options' ) &&
				isset(
					$_POST['wpda_wpnonce'],
					$_POST['wpda_schemaname'],
					$_POST['wpda_sqlqueryname'],
					$_POST['wpda_sqlqueryname_old'],
					$_POST['wpda_sqlquery']
				)
			) {
				$wpda_wpnonce          = sanitize_text_field( wp_unslash( $_POST['wpda_wpnonce'] ) ); // input var okay.
				$wpda_schemaname       = sanitize_text_field( wp_unslash( $_POST['wpda_schemaname'] ) ); // input var okay.
				$wpda_sqlqueryname     = sanitize_text_field( wp_unslash( $_POST['wpda_sqlqueryname'] ) ); // input var okay.
				$wpda_sqlqueryname_old = sanitize_text_field( wp_unslash( $_POST['wpda_sqlqueryname_old'] ) ); // input var okay.
				$wpda_sqlquery         = wp_unslash( $_POST['wpda_sqlquery'] ); // input var okay.

				if ( wp_verify_nonce( $wpda_wpnonce, 'wpda-query-builder-' . WPDA::get_current_user_id() ) ) {
					// Save query
					if ( false === $this->upd_query( $wpda_schemaname, $wpda_sqlqueryname, $wpda_sqlquery, $wpda_sqlqueryname_old ) ) {
						$response['status'] = 'Could not save query';
					} else {
						$response['status'] = 'Query saved';
					}
					echo json_encode( $response );
				} else {
					$response['status'] = 'Token expired';
					echo json_encode( $response );
				}
			} else {
				$response['status'] = 'Could not save query';
				echo json_encode( $response );
			}
		}

		public function open() {
			$response = [
				'data'   => [],
				'status' => null
			];

			$this->ajax_header();

			// Only for admins
			if (
				current_user_can( 'manage_options' ) &&
				isset(
					$_POST['wpda_wpnonce'],
					$_POST['wpda_exclude']
				)
			) {
				$wpda_wpnonce = sanitize_text_field( wp_unslash( $_POST['wpda_wpnonce'] ) ); // input var okay.
				$wpda_exclude = sanitize_text_field( wp_unslash( $_POST['wpda_exclude'] ) ); // input var okay.

				if ( wp_verify_nonce( $wpda_wpnonce, 'wpda-query-builder-' . WPDA::get_current_user_id() ) ) {
					// Send list of available queries
					$response['data'] = $this->get_query_list( $wpda_exclude );
					echo json_encode( $response );
				} else {
					$response['status'] = 'Token expired';
					echo json_encode( $response );
				}
			} else {
				$response['status'] = 'Query list not available';
				echo json_encode( $response );
			}
		}

		public function delete() {
			$response = [
				'status' => null
			];

			$this->ajax_header();

			// Only for admins
			if (
				current_user_can( 'manage_options' ) &&
				isset(
					$_POST['wpda_wpnonce'],
					$_POST['wpda_sqlqueryname']
				)
			) {
				$wpda_wpnonce      = sanitize_text_field( wp_unslash( $_POST['wpda_wpnonce'] ) ); // input var okay.
				$wpda_sqlqueryname = sanitize_text_field( wp_unslash( $_POST['wpda_sqlqueryname'] ) ); // input var okay.

				if ( wp_verify_nonce( $wpda_wpnonce, 'wpda-query-builder-' . WPDA::get_current_user_id() ) ) {
					// Save query
					if ( false === $this->del_query( $wpda_sqlqueryname ) ) {
						$response['status'] = 'Could not delete query';
					} else {
						$response['status'] = 'Query deleted';
					}
					echo json_encode( $response );
				} else {
					$response['status'] = 'Token expired';
					echo json_encode( $response );
				}
			} else {
				$response['status'] = 'Could not save query';
				echo json_encode( $response );
			}
		}

		protected function get_query_list( $exclude = '' ) {
			$wpda_query_builder_data = get_user_meta(
				WPDA::get_current_user_id(),
				'wpda_query_builder'
			);

			if ( sizeof( $wpda_query_builder_data ) > 0 ) {
				$queries = $wpda_query_builder_data[0];
				if ( '' !== $exclude ) {
					$exclude_array = explode( ',', $exclude );
					foreach ( $exclude_array as $exclude_item ) {
						unset( $queries[ $exclude_item ] );
					}
				}
				return $queries;
			} else {
				return [];
			}
		}

		protected function upd_query_list( $wpda_query_builder_data ) {
			update_user_meta(
				WPDA::get_current_user_id(),
				'wpda_query_builder',
				$wpda_query_builder_data
			);
		}

		protected function get_query( $query_name ) {
			$wpda_query_builder_data = $this->get_query_list();

			if (
				is_array( $wpda_query_builder_data ) && 
				isset( $wpda_query_builder_data[ $query_name ] )
			) {
				return $wpda_query_builder_data[ $query_name ];
			} else {
				return [];
			}
		}

		protected function upd_query( $schema_name, $query_name, $query_sql, $query_name_old ) {
			$wpda_query_builder_data = $this->get_query_list();
			if ( '' !== $query_name_old && $query_name !== $query_name_old ) {
				unset( $wpda_query_builder_data[ $query_name_old ] );
			}
			$wpda_query_builder_data[ $query_name ] = [
				'schema_name' => $schema_name,
				'query'       => $query_sql
			];
			$this->upd_query_list( $wpda_query_builder_data );
		}

		protected function del_query( $query_name ) {
			$wpda_query_builder_data = $this->get_query_list();
			unset( $wpda_query_builder_data[ $query_name ] );
			$this->upd_query_list( $wpda_query_builder_data );
		}

		protected function ajax_header() {
			header('Content-type: application/json');
			header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
			header('Cache-Control: post-check=0, pre-check=0', false);
			header('Pragma: no-cache');
			header('Expires: 0');
		}

	}

}