using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("histories")]
public class History
{
    [Key]
    [Column("id")]
    public int id { get; set; }

    // loại sự kiện: scan, view, play_audio...
    [Column("event_type")]
    public string event_type { get; set; }

    [Column("users_id")]
    public int? users_id { get; set; }

    [Column("narration_points_id")]
    public int NarrationPointId { get; set; }

    // thiết bị
    [Column("device_os")]
    public string device_os { get; set; }  // Android / iOS

    [Column("device_model")]
    public string device_model { get; set; } // Samsung S21, iPhone 11

    // session để nhóm hành vi
    [Column("session_id")]
    public string session_id { get; set; }

    // scan thành công hay không
    [Column("is_success")]
    public bool is_success { get; set; }

    [Column("created_at")]
    public DateTime created_at { get; set; } = DateTime.UtcNow;
}