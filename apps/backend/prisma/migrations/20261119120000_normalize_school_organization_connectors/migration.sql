-- Normalize every stored organization connector to the permanent format:
-- { "type": "line", "points": [{"x": ..., "y": ...}, ...] }
-- Legacy hierarchy metadata is intentionally excluded from the connector map.
DO $$
DECLARE
  current_value jsonb;
  connector_index integer;
  connector_value jsonb;
  normalized_value jsonb;
BEGIN
  SELECT "value"::jsonb INTO current_value
    FROM "SystemSetting"
   WHERE "key" = 'school_organization_structure';

  IF current_value IS NULL OR jsonb_typeof(current_value) <> 'array' THEN RETURN; END IF;

  SELECT item.ordinality - 1, item.value->'personName'
    INTO connector_index, connector_value
    FROM jsonb_array_elements(current_value) WITH ORDINALITY AS item(value, ordinality)
   WHERE item.value->>'id' = '__connectors__'
   LIMIT 1;

  IF connector_index IS NULL OR connector_value IS NULL OR jsonb_typeof(connector_value) <> 'string' THEN RETURN; END IF;
  connector_value := (connector_value #>> '{}')::jsonb;
  IF jsonb_typeof(connector_value) <> 'object' THEN RETURN; END IF;

  SELECT COALESCE(jsonb_object_agg(
    CASE
      WHEN trim(both '`' from item.key) LIKE 'shape:%'
        THEN trim(both '`' from item.key)
      ELSE 'shape:' || gen_random_uuid()::text
    END,
    jsonb_build_object(
      'type', 'line',
      'points', CASE
        WHEN jsonb_typeof(item.value->'points') = 'array'
          AND jsonb_array_length(item.value->'points') >= 2
          THEN item.value->'points'
        WHEN item.value ? 'start' AND item.value ? 'end'
          THEN jsonb_build_array(item.value->'start', item.value->'end')
        ELSE '[]'::jsonb
      END
    )
  ) FILTER (
    WHERE NOT (item.key LIKE '\_\_%' ESCAPE '\\')
      AND (
        (jsonb_typeof(item.value->'points') = 'array' AND jsonb_array_length(item.value->'points') >= 2)
        OR (item.value ? 'start' AND item.value ? 'end')
      )
  ), '{}'::jsonb)
    INTO normalized_value
    FROM jsonb_each(connector_value) AS item;

  UPDATE "SystemSetting"
     SET "value" = jsonb_set(
       current_value,
       ARRAY[connector_index::text, 'personName'],
       to_jsonb(normalized_value::text),
       false
     )::text,
         "updatedAt" = NOW()
   WHERE "key" = 'school_organization_structure';
END $$;
