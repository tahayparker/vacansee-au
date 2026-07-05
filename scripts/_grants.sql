GRANT ALL PRIVILEGES ON TABLE "AU-Rooms" TO service_role;
GRANT ALL PRIVILEGES ON TABLE "AU-Timings" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "AU-Rooms_id_seq" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "AU-Timings_id_seq" TO service_role;
NOTIFY pgrst, 'reload schema';
