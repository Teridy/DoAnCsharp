using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("languages")]
public class Language
{
    [Key]
    [Column("id")]
    public int id { get; set; }

    [Column("language_name")]
    public string language_name { get; set; }

    [Column("language_code")]
    public string language_code { get; set; }

}