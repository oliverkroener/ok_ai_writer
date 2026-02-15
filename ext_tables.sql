CREATE TABLE tx_okaiwriter_configuration (
    site_root_page_id int(11) unsigned DEFAULT '0' NOT NULL,
    dev_mode tinyint(1) unsigned DEFAULT '0' NOT NULL,
    mode varchar(20) DEFAULT 'azure' NOT NULL,
    api_url varchar(1024) DEFAULT '' NOT NULL,
    api_key_encrypted text,
    model varchar(100) DEFAULT 'gpt-4o' NOT NULL,
    UNIQUE KEY site_root (site_root_page_id)
);
