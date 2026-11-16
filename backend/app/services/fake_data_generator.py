import random
import uuid
from datetime import date, datetime, timedelta, timezone
from fractions import Fraction
from math import ceil, floor, nextafter
from typing import Any, Dict, Mapping, Optional, Sequence, Tuple


_FIRST_NAMES = (
    "Alex", "Avery", "Casey", "Jordan", "Morgan", "Riley", "Sam", "Taylor",
    "Cameron", "Drew", "Jamie", "Quinn",
)
_LAST_NAMES = (
    "Bennett", "Brooks", "Carter", "Diaz", "Ellis", "Foster", "Hayes",
    "Kim", "Morgan", "Patel", "Reed", "Rivera",
)
_EMAIL_DOMAINS = ("example.com", "example.net", "sample.org")


def _number_bounds(schema: Mapping[str, Any], integer: bool) -> Tuple[float, float]:
    minimum = schema.get("minimum", 0 if integer else 0.0)
    maximum = schema.get("maximum", 100 if integer else 1000.0)
    if "exclusiveMinimum" in schema:
        bound = schema["exclusiveMinimum"]
        minimum = max(
            minimum,
            floor(bound) + 1 if integer else nextafter(float(bound), float("inf")),
        )
    if "exclusiveMaximum" in schema:
        bound = schema["exclusiveMaximum"]
        maximum = min(
            maximum,
            ceil(bound) - 1 if integer else nextafter(float(bound), float("-inf")),
        )
    if integer:
        minimum = ceil(minimum)
        maximum = floor(maximum)
    if minimum > maximum:
        raise ValueError("Schema numeric constraints have no valid values")
    return minimum, maximum


def _random_string(schema: Mapping[str, Any], field_name: str, rng: Any) -> str:
    string_format = schema.get("format")
    if string_format == "email" or field_name == "email":
        local_part = f"{rng.choice(_FIRST_NAMES).lower()}.{uuid.uuid4().hex[:8]}"
        return f"{local_part}@{rng.choice(_EMAIL_DOMAINS)}"
    if string_format == "uuid":
        return str(uuid.uuid4())
    if string_format == "date":
        start = date(2020, 1, 1)
        return (start + timedelta(days=rng.randint(0, 3650))).isoformat()
    if string_format == "date-time":
        instant = datetime.now(timezone.utc) + timedelta(
            seconds=rng.randint(-86400, 86400)
        )
        return instant.isoformat(timespec="seconds").replace("+00:00", "Z")

    minimum = max(0, int(schema.get("minLength", 1)))
    maximum = int(schema.get("maxLength", max(minimum, 24)))
    if maximum < minimum:
        raise ValueError("Schema string length constraints have no valid values")
    if string_format == "phone" or field_name in {"phone", "phone_number", "telephone"}:
        digits = "".join(str(rng.randrange(10)) for _ in range(max(10, minimum)))
        return f"+1-{digits[:3]}-{digits[3:6]}-{digits[6:10]}"
    if field_name in {"name", "full_name", "username"}:
        value = f"{rng.choice(_FIRST_NAMES)} {rng.choice(_LAST_NAMES)}"
        return value[:maximum] if len(value) >= minimum else value + " " * (minimum - len(value))
    if field_name in {"first_name", "given_name"}:
        value = rng.choice(_FIRST_NAMES)
    elif field_name in {"last_name", "family_name"}:
        value = rng.choice(_LAST_NAMES)
    else:
        alphabet = "abcdefghijklmnopqrstuvwxyz"
        length = rng.randint(minimum, max(minimum, min(maximum, 16)))
        value = "".join(rng.choice(alphabet) for _ in range(length))

    if "pattern" in schema:
        pattern = schema["pattern"]
        if pattern in (r"^\d+$", r"^[0-9]+$"):
            value = "".join(str(rng.randrange(10)) for _ in range(max(1, minimum)))
        elif pattern in (r"^[A-Z]+$", r"^[A-Za-z]+$"):
            value = "".join(rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(max(1, minimum)))
    return value[:maximum]


def _resolve_ref(
    reference: str, components: Optional[Mapping[str, Any]]
) -> Any:
    if not reference.startswith("#/"):
        raise ValueError(f"Only local schema references are supported: {reference}")
    tokens = reference[2:].split("/")
    root: Any = {"components": components or {}}
    for token in tokens:
        token = token.replace("~1", "/").replace("~0", "~")
        if isinstance(root, Mapping) and token in root:
            root = root[token]
        elif isinstance(root, Sequence) and not isinstance(root, (str, bytes)):
            try:
                root = root[int(token)]
            except (ValueError, IndexError) as error:
                raise ValueError(f"Unresolvable local schema reference: {reference}") from error
        else:
            raise ValueError(f"Unresolvable local schema reference: {reference}")
    return root


def generate_fake_data(
    schema: Mapping[str, Any],
    record_count: int = 20,
    components: Optional[Mapping[str, Any]] = None,
    *,
    rng: Any = None,
    max_depth: int = 8,
) -> Any:
    """Generate schema-shaped random data; top-level arrays have exactly record_count items."""
    if record_count < 0:
        raise ValueError("record_count must be non-negative")
    if max_depth < 1:
        raise ValueError("max_depth must be at least 1")
    if not isinstance(schema, Mapping):
        raise TypeError("schema must be a mapping")
    generator = rng or random.SystemRandom()
    return _generate_value(schema, "", record_count, components, generator, max_depth, 0, frozenset())


def _generate_value(
    schema: Mapping[str, Any],
    field_name: str,
    record_count: int,
    components: Optional[Mapping[str, Any]],
    rng: Any,
    max_depth: int,
    depth: int,
    active_refs: frozenset,
) -> Any:
    reference = schema.get("$ref")
    if isinstance(reference, str):
        if reference in active_refs:
            return {}
        resolved = _resolve_ref(reference, components)
        if not isinstance(resolved, Mapping):
            raise ValueError(f"Referenced schema is not an object: {reference}")
        return _generate_value(
            resolved,
            field_name,
            record_count,
            components,
            rng,
            max_depth,
            depth,
            active_refs | {reference},
        )

    if "enum" in schema:
        values = schema["enum"]
        if not isinstance(values, list) or not values:
            raise ValueError("Schema enum must be a non-empty list")
        return rng.choice(values)
    if "const" in schema:
        return schema["const"]

    properties = schema.get("properties")
    schema_type = schema.get("type")
    if isinstance(schema_type, list):
        schema_type = next((item for item in schema_type if item != "null"), "null")
    if schema_type is None:
        if isinstance(properties, Mapping):
            schema_type = "object"
        elif "items" in schema:
            schema_type = "array"

    if schema_type == "object":
        if depth >= max_depth:
            return {}
        generated: Dict[str, Any] = {}
        if isinstance(properties, Mapping):
            for name, property_schema in properties.items():
                if isinstance(property_schema, Mapping):
                    generated[name] = _generate_value(
                        property_schema,
                        str(name).lower(),
                        record_count,
                        components,
                        rng,
                        max_depth,
                        depth + 1,
                        active_refs,
                    )
        additional = schema.get("additionalProperties")
        if isinstance(additional, Mapping) and depth + 1 < max_depth:
            generated["additionalProperty"] = _generate_value(
                additional,
                "additionalProperty",
                record_count,
                components,
                rng,
                max_depth,
                depth + 1,
                active_refs,
            )
        return generated

    if schema_type == "array":
        item_schema = schema.get("items", {})
        if not isinstance(item_schema, Mapping):
            raise ValueError("Array schema items must be an object")
        if depth == 0:
            count = record_count
        else:
            minimum = max(0, int(schema.get("minItems", 1)))
            maximum = max(minimum, int(schema.get("maxItems", max(minimum, 3))))
            count = rng.randint(minimum, maximum)
        unique_ids = _unique_array_ids(
            item_schema,
            count,
            components,
            rng,
            max_depth,
        )
        generated_items = []
        for index in range(count):
            item = _generate_value(
                item_schema,
                field_name.rstrip("s"),
                record_count,
                components,
                rng,
                max_depth,
                depth + 1,
                active_refs,
            )
            if unique_ids is not None and isinstance(item, dict):
                item["id"] = unique_ids[index]
            generated_items.append(item)
        return generated_items

    if schema_type == "string":
        return _random_string(schema, field_name, rng)
    if schema_type == "integer":
        minimum, maximum = _number_bounds(schema, integer=True)
        if field_name in {"age", "years"}:
            minimum = max(minimum, 0)
            maximum = min(maximum, 100)
        if minimum > maximum:
            raise ValueError("Schema integer constraints have no valid values")
        if "multipleOf" in schema:
            multiple = Fraction(str(schema["multipleOf"]))
            if multiple <= 0:
                raise ValueError("Schema multipleOf must be greater than zero")
            step = multiple.numerator
            first = ceil(minimum / step) * step
            last = floor(maximum / step) * step
            if first > last:
                raise ValueError("Schema integer constraints have no valid values")
            return rng.randrange(int(first), int(last) + 1, int(step))
        return rng.randint(int(minimum), int(maximum))
    if schema_type == "number":
        minimum, maximum = _number_bounds(schema, integer=False)
        if "multipleOf" in schema:
            multiple = Fraction(str(schema["multipleOf"]))
            if multiple <= 0:
                raise ValueError("Schema multipleOf must be greater than zero")
            first = ceil(Fraction(str(minimum)) / multiple)
            last = floor(Fraction(str(maximum)) / multiple)
            if first > last:
                raise ValueError("Schema number constraints have no valid values")
            return float(multiple * rng.randint(int(first), int(last)))
        return round(rng.uniform(minimum, maximum), int(schema.get("x-precision", 2)))
    if schema_type == "boolean":
        return bool(rng.getrandbits(1))
    if schema_type == "null":
        return None

    raise ValueError(f"Unsupported schema type: {schema_type!r}")


def _unique_array_ids(
    item_schema: Mapping[str, Any],
    count: int,
    components: Optional[Mapping[str, Any]],
    rng: Any,
    max_depth: int,
) -> Optional[list[Any]]:
    resolved_item_schema = item_schema
    while isinstance(resolved_item_schema.get("$ref"), str):
        resolved_item_schema = _resolve_ref(
            resolved_item_schema["$ref"],
            components,
        )
        if not isinstance(resolved_item_schema, Mapping):
            return None

    properties = resolved_item_schema.get("properties")
    if not isinstance(properties, Mapping):
        return None
    id_schema = properties.get("id")
    if not isinstance(id_schema, Mapping):
        return None
    if count == 0:
        return []

    resolved_id_schema = id_schema
    seen_references = set()
    while isinstance(resolved_id_schema.get("$ref"), str):
        reference = resolved_id_schema["$ref"]
        if reference in seen_references:
            raise ValueError(f"Circular ID schema reference: {reference}")
        seen_references.add(reference)
        resolved_id_schema = _resolve_ref(reference, components)
        if not isinstance(resolved_id_schema, Mapping):
            return None

    if "enum" in resolved_id_schema:
        enum_values = resolved_id_schema["enum"]
        if not isinstance(enum_values, list) or not enum_values:
            raise ValueError("Schema enum must be a non-empty list")
        distinct_values = []
        for value in enum_values:
            if value not in distinct_values:
                distinct_values.append(value)
        if count > len(distinct_values):
            raise ValueError("Array count exceeds the number of unique enum IDs")
        return rng.sample(distinct_values, count)

    generation_schema = resolved_id_schema
    if (
        resolved_id_schema.get("type") == "integer"
        and "maximum" not in resolved_id_schema
        and "exclusiveMaximum" not in resolved_id_schema
    ):
        minimum, _ = _number_bounds(resolved_id_schema, integer=True)
        generation_schema = {
            **resolved_id_schema,
            "maximum": int(minimum) + max(100, count * 10),
        }

    values = []
    attempts = 0
    max_attempts = max(100, count * 20)
    while len(values) < count and attempts < max_attempts:
        value = _generate_value(
            generation_schema,
            "id",
            count,
            components,
            rng,
            max_depth,
            0,
            frozenset(),
        )
        if value not in values:
            values.append(value)
        attempts += 1
    if len(values) != count:
        raise ValueError("Could not generate enough unique IDs within schema constraints")
    return values
