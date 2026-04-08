using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization; 

[Table("audios")]
public class Audio
{
    [Key]
    [Column("id")]
    [JsonPropertyName("audio_id")]
    public int Id { get; set; }

    [Column("title")]
    [JsonPropertyName("audio_title")] 
    public string Title { get; set; }

    [Column("audio_url")]
    [JsonPropertyName("audio_url")]
    public string AudioUrl { get; set; }

    [Column("audio_text")]
    [JsonPropertyName("audio_text")]
    public string? AudioText { get; set; } 

    [Column("is_active")]
    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true; 

    [Column("narration_point_id")]
    [JsonPropertyName("poi_id")] 
    public int NarrationPointId { get; set; }
    
}