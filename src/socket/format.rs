use serde_json;

/// 数据格式类型
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub enum DataFormat {
    Hex,
    #[default]
    Text,
    Json,
}



impl std::str::FromStr for DataFormat {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "hex" => Ok(DataFormat::Hex),
            "text" => Ok(DataFormat::Text),
            "json" => Ok(DataFormat::Json),
            _ => Err(format!("Unknown format: {}", s)),
        }
    }
}

/// 格式化数据为字符串
pub fn format_data(data: &[u8], format: DataFormat) -> String {
    match format {
        DataFormat::Hex => format_hex(data),
        DataFormat::Text => format_text(data),
        DataFormat::Json => format_json(data),
    }
}

fn format_hex(data: &[u8]) -> String {
    data.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<_>>()
        .join(" ")
}

fn format_text(data: &[u8]) -> String {
    String::from_utf8_lossy(data).into_owned()
}

fn format_json(data: &[u8]) -> String {
    match serde_json::from_slice::<serde_json::Value>(data) {
        Ok(json) => serde_json::to_string_pretty(&json).unwrap_or_else(|_| format_text(data)),
        Err(_) => format_text(data),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_hex() {
        let data = b"hello";
        let result = format_data(data, DataFormat::Hex);
        assert_eq!(result, "68 65 6c 6c 6f");
    }

    #[test]
    fn test_format_text() {
        let data = b"hello world";
        let result = format_data(data, DataFormat::Text);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_format_json_valid() {
        let data = br#"{"name":"test"}"#;
        let result = format_data(data, DataFormat::Json);
        assert!(result.contains("name"));
        assert!(result.contains("test"));
    }

    #[test]
    fn test_format_json_invalid() {
        let data = b"not json";
        let result = format_data(data, DataFormat::Json);
        assert_eq!(result, "not json");
    }

    #[test]
    fn test_data_format_from_str() {
        assert_eq!("hex".parse::<DataFormat>().unwrap(), DataFormat::Hex);
        assert_eq!("text".parse::<DataFormat>().unwrap(), DataFormat::Text);
        assert_eq!("json".parse::<DataFormat>().unwrap(), DataFormat::Json);
        assert!("invalid".parse::<DataFormat>().is_err());
    }
}
