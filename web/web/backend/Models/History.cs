using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("histories")]
public class History
{
    [Key]
    [Column("id")]
    public int id { get; set; }

    [Column("event_type")]
    public string? event_type { get; set; }

    [Column("users_id")]
    public int? users_id { get; set; }

    [Column("narration_points_id")]
    public int NarrationPointId { get; set; }

    [Column("created_at")]
    public DateTime created_at { get; set; } = DateTime.UtcNow;
}